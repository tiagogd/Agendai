const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario');

//ROTA DESCONTINUADA

router.post('/', async (req, res) => {
  try {
    const usuario = await new Usuario(req.body).save();
    res.json({ usuario }); //Poderia ser tambem res.json({ usuario: usuario })
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

module.exports = router;
