const express = require('express');
const router = express.Router();
const Salao = require('../models/salao');
const Servico = require('../models/servico');
const Horario = require('../models/horario');
const turf = require('@turf/turf');
const util = require('../util');
const moment = require('moment');

router.post('/', async (req, res) => {
  try {
    const salao = await new Salao(req.body).save();
    res.json({ salao }); //Poderia ser tambem res.json({ salao: salao })
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { salaoId } = req.params;
    const salao = await Salao.find({
      //salaoId,
      //status: 'A',
    }); //.select('_id titulo');

    /* [{ label: 'Serviço', value: '123123123' ]}*/
    res.json({
      error: false,
      salao: salao.map((s) => ({ label: s.titulo, value: s._id })),
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

//Verificar todos os serviços de um Salão
router.get('/servicos/:salaoId', async (req, res) => {
  try {
    const { salaoId } = req.params;
    const servicos = await Servico.find({
      salaoId,
      status: 'A',
    }).select('_id titulo');

    /* [{ label: 'Serviço', value: '123123123' ]}*/
    res.json({
      error: false,
      servicos: servicos.map((s) => ({ label: s.titulo, value: s._id })),
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.post('/filter/:id', async (req, res) => {
  try {
    const salao = await Salao.findById(req.params.id).select(req.body.fields);

    const distance = turf
      .distance(
        turf.point(salao.geo.coordinates),
        turf.point([-30.043858, -51.103487])
      )
      .toFixed(2);

    const horarios = await Horario.find({
      salaoId: req.params.id,
    }).select('dias inicio fim');

    //const isOpened = await util.isOpened(horarios);

    res.json({ error: false, salao: { ...salao._doc, distance, isOpened } });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

module.exports = router;
