const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Horario = require('../models/horario');
const Agendamento = require('../models/agendamento');
const Cliente = require('../models/cliente');
const Salao = require('../models/salao');
const Servico = require('../models/servico');
const Colaborador = require('../models/colaborador');
const keys = require('../data/keys.json');
const util = require('../util');
const pagarme = require('../services/pagarme');
const _ = require('lodash');
const moment = require('moment');

//filtra todos os agendamentos de um salão
router.post('/filter', async (req, res) => {
  try {
    //Busca por periodo de agendamento
    const { periodo, salaoId } = req.body;

    const agendamentos = await Agendamento.find({
      salaoId,
      data: {
        $gte: moment(periodo.inicio).startOf('day'),
        $lte: moment(periodo.final).endOf('day'),
      },
    }).populate([
      { path: 'servicoId', select: 'titulo duracao' },
      { path: 'colaboradorId', select: 'nome' },
      { path: 'clienteId', select: 'nome' },
    ]);

    res.json({ error: false, agendamentos });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});
//Criar agendamentos
router.post('/', async (req, res) => {
  const db = mongoose.connection;
  const session = await db.startSession();
  session.startTransaction();

  try {
    const { clienteId, salaoId, servicoId, colaboradorId } = req.body;

    //RECUPERAR O CLIENTE
    const cliente = await Cliente.findById(clienteId).select(
      'nome endereco customerId'
    );
    //RECUPERAR O SALÃO
    const salao = await Salao.findById(salaoId).select('recipientId');
    //RECUPERAR O SERVIÇO
    const servico = await Servico.findById(servicoId).select(
      'preco titulo comissao'
    );
    //RECUPERAR O COLABORADOR
    const colaborador = await Colaborador.findById(colaboradorId).select(
      'recipientId'
    );

    // PREÇO TOTAL DA TRANSAÇÃO
    const precoFinal = util.toCents(servico.preco) * 100;

    // REGRAS DE SPLIT DO COLABORADOR
    const colaboradoreSplitRule = {
      recipient_id: colaborador.recipientId,
      amount: parseInt(precoFinal * (servico.comissao / 100)),
    };

    /*/REMOVER DAQUI
    // CRIANDO PAGAMENTO MESTRE
    const createPayment = await pagarme('/transactions', {
      //VALOR TOTAL
      amount: precoFinal,
      //DADOS DO CARTÂO
      card_number: '4111111111111111',
      card_cvv: '123',
      card_expiration_date: '0922',
      card_holder_name: 'Morpheus Fishburne',
      customer: {
        id: cliente.customerId,
      },
      billing: {
        // SUBISTITUIR COM OS DADOS DO CLIENTE
        name: cliente.nome,
        address: {
          country: cliente.endereco.pais.toLowerCase(),
          state: cliente.endereco.uf.toLowerCase(),
          city: cliente.endereco.cidade,
          street: cliente.endereco.logradouro,
          street_number: cliente.endereco.numero,
          zipcode: cliente.endereco.cep,
        },
      },
      //Itens da venda
      items: [
        {
          id: servicoId,
          title: servico.titulo,
          unit_price: precoFinal,
          quantity: 1,
          tangible: false,
        },
      ],
      split_rules: [
        // TAXA DO SALÃO (Preço final - taxa do app - taxa do colaborador)
        {
          recipient_id: salao.recipientId,
          amount: precoFinal - keys.app_fee - colaboradoreSplitRule.amount,
        },
        // TAXAS DOS ESPECIALISTAS / COLABORADORES
        colaboradoreSplitRule,
        // TAXA DO APP
        {
          recipient_id: keys.recipient_id,
          amount: keys.app_fee,
          charge_processing_fee: false,
        },
      ],
    });

    if (createPayment.error) {
      throw { message: createPayment.message };
    }
    //ATÉ AQUI */

    // CRIAR O AGENDAMENTOS E AS TRANSAÇÕES
    // TRANSFORMAR EM INSERT MANY
    let agendamento = req.body;
    agendamento = {
      ...agendamento,
      //transactionId: createPayment.data.id,
      comissao: servico.comissao,
      valor: servico.preco,
    };
    await new Agendamento(agendamento).save();

    await session.commitTransaction();
    session.endSession();
    res.json({ error: false, agendamento: agendamento.dataCadastro });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.json({ error: true, message: err.message });
  }
});
//Verifica na agenda se tem dias disponíveis
router.post('/dias-disponiveis', async (req, res) => {
  try {
    const { data, salaoId, servicoId } = req.body;
    const horarios = await Horario.find({ salaoId });
    const servico = await Servico.findById(servicoId).select('duracao');
    let colaboradores = [];

    let agenda = [];
    let lastDay = moment(data);

    // DURAÇÃO DO SERVIÇO
    const servicoDuracao = util.hourToMinutes(
      moment(servico.duracao).format('HH:mm')
    );

    const servicoDuracaoSlots = util.sliceMinutes(
      moment(servico.duracao),
      moment(servico.duracao).add(servicoDuracao, 'minutes'),
      util.SLOT_DURATION,
      false
    ).length;
    //BUSCA NOS PRÓXIMOS 365 DIAS DISPONIBILIDADE NA AGENDA ATÉ CONTER 7 DIAS DISPONIVEIS
    for (let i = 0; i <= 365 && agenda.length <= 7; i++) {
      const espacosValidos = horarios.filter((h) => {
        // VERIFICAR DIA DA SEMANA
        const diaSemanaDisponivel = h.dias.includes(moment(lastDay).day());

        // VERIFICAR ESPECIALIDADE DISPONÍVEL
        const servicosDisponiveis = h.especialidades.includes(servicoId);

        return diaSemanaDisponivel && servicosDisponiveis;
      });

      if (espacosValidos.length > 0) {
        // TODOS OS HORÁRIOS DISPONÍVEIS DAQUELE DIA
        let todosHorariosDia = {};
        for (let espaco of espacosValidos) {
          for (let colaborador of espaco.colaboradores) {
            if (!todosHorariosDia[colaborador._id]) {
              todosHorariosDia[colaborador._id] = [];
            }
            todosHorariosDia[colaborador._id] = [
              ...todosHorariosDia[colaborador._id],
              ...util.sliceMinutes(
                util.mergeDateTime(lastDay, espaco.inicio),
                util.mergeDateTime(lastDay, espaco.fim),
                util.SLOT_DURATION
              ),
            ];
          }
        }

        // SE TODOS OS ESPECIALISTAS DISPONÍVEIS ESTIVEREM OCUPADOS NO HORÁRIO, REMOVER
        for (let colaboradorKey of Object.keys(todosHorariosDia)) {
          // LER AGENDAMENTOS DAQUELE ESPECIALISTA NAQUELE DIA
          const agendamentos = await Agendamento.find({
            colaboradorId: colaboradorKey,
            data: {
              $gte: moment(lastDay).startOf('day'),
              $lte: moment(lastDay).endOf('day'),
            },
          })
            .select('data servicoId -_id')
            .populate('servicoId', 'duracao');

          // RECUPERANDO HORÁRIOS OCUPADOS
          let horariosOcupado = agendamentos.map((a) => ({
            inicio: moment(a.data),
            fim: moment(a.data).add(servicoDuracao, 'minutes'),
          }));

          //RECUPERANDO SLOTS ENTRE OS AGENDAMENTOS
          horariosOcupado = horariosOcupado
            .map((h) =>
              util.sliceMinutes(h.inicio, h.fim, util.SLOT_DURATION, false)
            )
            .flat();

          // REMOVENDO TODOS OS HORÁRIOS QUE ESTÃO OCUPADOS
          let horariosLivres = util.splitByValue(
            _.uniq(
              todosHorariosDia[colaboradorKey].map((h) => {
                return horariosOcupado.includes(h) ? '-' : h;
              })
            ),
            '-'
          );

          // VERIFICANDO SE NOS HORÁRIOS CONTINUOS EXISTE SPAÇO SUFICIENTE NO SLOT
          horariosLivres = horariosLivres
            .filter((h) => h.length >= servicoDuracaoSlots)
            .flat();

          /* VERIFICANDO OS HORÁRIOS DENTRO DO SLOT 
            QUE TENHAM A CONTINUIDADE NECESSÁRIA DO SERVIÇO
          */
          horariosLivres = horariosLivres.map((slot) =>
            slot.filter(
              (horario, index) => slot.length - index >= servicoDuracaoSlots
            )
          );

          // SEPARANDO 2 EM 2
          horariosLivres = _.chunk(horariosLivres, 2);

          // REMOVENDO O COLABORADOR DO DIA, CASO NÃO TENHA ESPAÇOS NA AGENDA
          if (horariosLivres.length === 0) {
            todosHorariosDia = _.omit(todosHorariosDia, colaboradorKey);
          } else {
            todosHorariosDia[colaboradorKey] = horariosLivres;
          }
        }

        // VERIFICANDO SE TEM ESPECIALISTA COMA AGENDA NAQUELE DIA
        const totalColaboradores = Object.keys(todosHorariosDia).length;

        if (totalColaboradores > 0) {
          colaboradores.push(Object.keys(todosHorariosDia));
          console.log(todosHorariosDia);
          agenda.push({
            [moment(lastDay).format('YYYY-MM-DD')]: todosHorariosDia,
          });
        }
      }

      lastDay = moment(lastDay).add(1, 'day');
    }

    colaboradores = await Colaborador.find({
      _id: { $in: _.uniq(colaboradores.flat()) },
    }).select('nome foto');

    colaboradores = colaboradores.map((c) => ({
      ...c._doc,
      nome: c.nome.split(' ')[0],
    }));

    res.json({ error: false, colaboradores, agenda });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

module.exports = router;
