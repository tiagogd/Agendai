const Header = () => {
  return (
    <header className="container-fluid d-flex justify-content-end">
      <div className="d-flex align-items-center">
        <div className="text-right mr-3">
          <span className="d-block m-0 p-0 text-white">Studio dos Pés</span>
          <small className="m-0 p-0">Plano Gold</small>
        </div>
        <img src="https://cdn3.iconfinder.com/data/icons/avatars-flat/33/woman_7-512.png" />
        <span className="mdi mdi-chevron-down text-white"></span>
      </div>
    </header>
  );
};

export default Header;
