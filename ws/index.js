const express = require('express');
const app = express();
const morgan = require('morgan');
//const cors = require('cors');
const busboy = require('connect-busboy');
const busboyBodyParser = require('busboy-body-parser');
require('./database');

//MIDDLEWARES
app.use(morgan('dev'));
app.use(express.json()); //Informando ao banco que serão enviados dados do tipo JSON
app.use(busboy());
app.use(busboyBodyParser());
//app.use(cors());

//VARIABLES
app.set('port', 8000);

//ROTAS
app.use('/salao', require('./src/routes/salao.routes'));
app.use('/servico', require('./src/routes/servico.routes'));
app.use('/horario', require('./src/routes/horario.routes'));
app.use('/agendamento', require('./src/routes/agendamento.routes'));
app.use('/cliente', require('./src/routes/cliente.routes'));
app.use('/colaborador', require('./src/routes/colaborador.routes'));
//app.use('/usuario', require('./src/routes/usuario.routes')); //DESCONTINUADA

app.listen(app.get('port'), () => {
  console.log(`WS Escutando na porta ${app.get('port')}`);
});
