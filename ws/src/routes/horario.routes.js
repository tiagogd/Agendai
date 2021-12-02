const express = require('express');
const router = express.Router();
const _ = require('lodash');
const Horario = require('../models/horario');
const ColaboradorServico = require('../models/relationship/colaboradorServico');

router.post('/', async (req, res) => {
  try {
    // VERIFICAR SE EXISTE ALGUM HORARIO, NAQUELE DIA, PRAQUELE SALÃO

    // SE NÃO HOVER, CADASTRA
    await new Horario(req.body).save();

    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

//RECUPERA TODOS OS HORARIOS DE UM SALÃO
router.get('/salao/:salaoId', async (req, res) => {
  try {
    const { salaoId } = req.params;

    const horarios = await Horario.find({
      salaoId,
    });

    res.json({ error: false, horarios });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

//ATUALIZA OS HORARIOS DE UM SALÃO
router.put('/:horarioId', async (req, res) => {
  try {
    const { horarioId } = req.params;
    const horario = req.body;

    // SE NÃO HOVER, ATUALIZA
    await Horario.findByIdAndUpdate(horarioId, horario);

    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

//BUSCAR COLABORADOR POR DETERMINADO SERVIÇO PRA MONTAR O HORARIO
router.post('/colaboradores', async (req, res) => {
  try {
    const colaboradores = await ColaboradorServico.find({
      servicoId: { $in: req.body.especialidades },
      status: 'A',
    })
      .populate('colaboradorId', 'nome')
      .select('colaboradorId -_id');

    //res.json({ error: false, colaboradores });

    const listaColaboradores = _.uniqBy(colaboradores, (vinculo) =>
      vinculo.colaboradorId._id.toString()
    ).map((vinculo) => ({
      label: vinculo.colaboradorId.nome,
      value: vinculo.colaboradorId._id,
    }));

    res.json({ error: false, colaboradores: listaColaboradores });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.delete('/:horarioId', async (req, res) => {
  try {
    const { horarioId } = req.params;
    await Horario.findByIdAndDelete(horarioId);
    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

module.exports = router;
