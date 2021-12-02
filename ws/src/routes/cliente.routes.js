const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Cliente = require('../models/cliente');
const SalaoCliente = require('../models/relationship/salaoCliente');
const pagarme = require('../services/pagarme');
const moment = require('moment');

router.post('/', async (req, res) => {
  const db = mongoose.connection;
  const session = await db.startSession();
  session.startTransaction();

  try {
    const { cliente, salaoId } = req.body;
    let newClient = null;
    //VERIFICA SE O CLIENTE EXISTE
    const existentClient = await Cliente.findOne({
      $or: [
        { email: cliente.email },
        { telefone: cliente.telefone },
        //{ cpf: cliente.cpf },
      ],
    });
    //SE NÃO EXISTIR O CLIENTE
    if (!existentClient) {
      const _id = mongoose.Types.ObjectId();
      const cliente = req.body.cliente;
      console.log(cliente);

      //CRIAR CUSTOMER
      /*const pagarmeCustomer = await pagarme('/customers', {
        external_id: _id,
        name: cliente.nome,
        type: cliente.documento.tipo === 'CPF' ? 'individual' : 'corporation',
        country: cliente.endereco.pais,
        email: cliente.email,
        documents: [
          {
            type: cliente.documento.tipo,
            number: cliente.documento.numero,
          },
        ],
        phone_numbers: ['+55' + cliente.telefone],
        birthday: cliente.dataNascimento,
      });

      console.log(pagarmeCustomer);

      if (pagarmeCustomer.error) {
        throw pagarmeCustomer;
      }*/

      //CRIANDO CLIENTE
      newClient = await new Cliente({
        _id,
        ...cliente,
        // customerId: pagarmeCustomer.data.id,
      }).save({ session });
    }

    //RELACIONAMENTO
    const clienteId = existentClient ? existentClient._id : newClient._id;

    //VERIFICA SE JÁ EXISTE O RELACIONAMENTO COM O SALÃO
    const existentRelationship = await SalaoCliente.findOne({
      salaoId,
      clienteId,
    });

    //SE NÃO ESTÁ VINCULADO
    if (!existentRelationship) {
      await new SalaoCliente({
        salaoId,
        clienteId,
      }).save({ session });
    }

    //SE JÁ EXISTIR O VINCULO ENTRE CLIENTE E SALÃO
    if (existentRelationship && existentRelationship.status === 'I') {
      await SalaoCliente.findOneAndUpdate(
        {
          salaoId,
          clienteId,
        },
        { status: 'A' },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    if (
      existentRelationship &&
      existentRelationship.status === 'A' &&
      existentClient
    ) {
      res.json({ error: true, message: 'Cliente já cadastrado!' });
    } else {
      res.json({ error: false });
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.json({ error: true, message: err.message });
  }
});

router.post('/filter', async (req, res) => {
  try {
    const clientes = await Cliente.find(req.body.filters);
    res.json({ error: false, clientes });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get('/filter', async (req, res) => {
  try {
    const clientes = await Cliente.find(req.body.filters);
    res.json({ error: false, clientes });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get('/salao/:salaoId', async (req, res) => {
  try {
    const clientes = await SalaoCliente.find({
      salaoId: req.params.salaoId,
      status: 'A',
    })
      .populate('clienteId')
      .select('clienteId');

    res.json({
      error: false,
      clientes: clientes.map((c) => ({
        ...c.clienteId._doc,
        vinculoId: c._id,
        dataCadastro: moment(c.dataCadastro).format('DD/MM/YYYY'),
      })),
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.delete('/vinculo/:id', async (req, res) => {
  try {
    await SalaoCliente.findByIdAndUpdate(req.params.id, { status: 'I' });
    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

module.exports = router;
