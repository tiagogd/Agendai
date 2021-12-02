const mongoose = require('mongoose');
const URI = ''; //End do banco de dados

//Na versão 6 do mongoose, essas opções já vem por padrão. Não é necessário acrescentar elas
/*mongoose.set(`useNewUrlParser`, true);
mongoose.set(`useFindAndModify`, false);
mongoose.set(`useCreateIndex`, true);
mongoose.set(`useUnifiedTopology`, true);*/

mongoose
  .connect(URI)
  .then(() => console.log('Banco de dados conectado! ;)'))
  .catch(() => console.log(err));
