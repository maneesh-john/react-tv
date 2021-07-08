const global = { 
  duration: 20000,
  baseUrl: "https://app-api.theapollo.com/api"
}

const socket = new WebSocket("wss://app-api.theapollo.com/api/displayapp");

// Socket events
const types = {
  getOtp: "GENERATE_ACTIVATION_CODE",
  getOtpResp: "GENERATE_ACTIVATION_CODE_RESPONSE",
  deviceActivationResp: "DEVICE_ACTIVATED",
  getPlaylist: "GET_PLAYLISTS_AND_DISPLAY_STATE",
  getPlaylistResp: "GET_PLAYLISTS_AND_DISPLAY_STATE_RESPONSE",
  playlistUpdateResp: "UPDATED_PLAYLISTS",
  changePlaylistResp: "CHANGE_PLAYLIST",
  chageDurationResp: "CHANGE_DURATION"
}

const authBody = {
  "Type": types.getOtp,
  "Body": "{\"DeviceId\": \"qwerty_asd\"}"
}

const getPlaylistBody = {
  "Type": types.getPlaylist,
  "Body": "qwerty_asd"
}

const pingBody = {
  "Type": "Ping",
  "Body": "qwerty_asd"
}

// Helpers
function isValid(item){
  return (item !== undefined) && (item !== null) && (item !== NaN);
}

function canParse(stringified){
  if(typeof stringified === "string"){
    const parsed = JSON.parse(stringified);
    return isValid(parsed);
  }
  return false;
}

function carouselItem(props){
  return {
    id: `item-${props.index}`,
    layout: `
      <div id="item-${props.index}" class="carousel-item ${props.index === 0? "active": ""}">
        <img src="${props.url}" class="carousel-image" />
      </div
    `
  }
}

function renderCarousel(data){
  const carousel = document.querySelector(".carousel");
  if(Array.isArray(data)){
    data.forEach((item, index) => {
      const elem = carouselItem({
        index,
        url: item.artFile.fileURL
      });
      carousel.innerHTML += elem.layout;
    });
    carousel.style.display = "block";
    playCarousel(data.length);
  }

  function playCarousel(length){
    let current = 0;
    setInterval(() => {
      const nextIndex = (current + 1 >= length)? 0: current + 1;
      const visibleItem = document.querySelector(`#item-${current}`);
      const nextItem = document.querySelector(`#item-${nextIndex}`);
      visibleItem.classList.remove("active");
      visibleItem.classList.add("fade");
      nextItem.classList.remove("fade");
      nextItem.classList.add("active");
      current = nextIndex;
    }, 15000);
  }
}

// Actions

function setupPing(){
  const timer = setInterval(() => {
    console.log("ping");
    socket.send(JSON.stringify(pingBody));
  }, 30000);
  return timer;
}

function getCarouselData(cb){
  fetch(global.baseUrl + "/displayapp/defaultcontent")
    .then(resp => {
      if(resp.status < 205){
        resp.json().then(data => {
          const releventData = data.playlistItems.map(item => item.works[0]);
          if(typeof cb === "function"){
            cb(releventData);
          }
        })
        .catch(err => {
          console.log(err);
        });
      }
    })
    .catch(err => {
      console.log(err);
      if(typeof cb === "function"){
        cb([{artFile: {fileURL: "https://apollo-content.s3.amazonaws.com/art/1/40305ae9-ac28-44da-ac73-eef4f7456918.png"}}]);
      }
    });
}

function messageHandler(message){
  if(canParse(message)){
    const resp = JSON.parse(message);
    switch(resp.Type){
      case types.getOtpResp:
        return({ type: "SET_OTP", payload: resp.Body });
      case types.deviceActivationResp:
        return({ type: "SET_AUTH", payload: true });
      case types.getPlaylistResp:
        const data = JSON.parse(resp.Body);
        return({ type: "SET_PLAYLISTS", payload: data });
      case types.playlistUpdateResp:
        return({ type: "PLAYLISTS_UPDATED" });
      case types.changePlaylistResp:
        return({ type: "CHANGE_PLAYLIST" });
      case types.chageDurationResp:
        const newRes = JSON.parse(resp.Body);
        return({ type: "DURATION_UPDAE" });
      default:
        return null;
    }
  }
}

const initState = {
  auth: false,
  carousel: [],
  socket: null,
  playlists: [],
  displayState: {},
  otp: ""
}

// Reducer for context

function appReducer(state = initState, action){
  switch(action.type){
    case "SET_AUTH":
      if(action.payload){
        localStorage.setItem("auth", true);
      } else {
        localStorage.removeItem("auth");
      }
      return {
        ...state,
        auth: action.payload
      }
    case "SET_CAROUSEL":
      return {
        ...state,
        carousel: action.payload
      }
    case "SET_SOCKET":
      return {
        ...state,
        socket: action.payload
      }
    case "SET_OTP":
      return {
        ...state,
        otp: action.payload
      }
    case "SET_PLAYLISTS":
      return {
        ...state,
        playlists: action.payload.Playlists,
        displayState: action.payload.DisplayState
      }
    default:
      return state;
  }
}

// Context

const AppContext = React.createContext();

const Provider = (props) => {

  const [state, dispatch] = React.useReducer(appReducer, initState)

  return(
    <AppContext.Provider value={{
      state,
      dispatch
    }}>
      {props.children}
    </AppContext.Provider>
  )
}

// Components

const Splash = (props) => {

  const context = React.useContext(AppContext);

  const manageCarouselData = (data) => {
    if(Array.isArray(data)){
      context.dispatch({
        type: "SET_CAROUSEL",
        payload: data
      });
      renderCarousel(data);
    }
    console.log("AYUT", context.state)
    if(!context.state.auth){
      props.history.push("/auth");
    } else {
      props.history.push("/home");
    }
  }

  React.useEffect(() => {
    const auth = localStorage.getItem("auth");
    if(auth){
      context.dispatch({ type: "SET_AUTH", payload: true });
    }
    getCarouselData(manageCarouselData);
  }, []);

  return (
    <div id="splash" className="modal">
      <div className="overlay">
        <img src="images/logo.svg" className="splash-logo" />
      </div>
    </div>
  );
}

const Auth = (props) => {

  const context = React.useContext(AppContext);

  React.useEffect(() => {
    if(context.state.auth){
      props.history.push("Home");
    }
  }, [context.state.auth]);

  return(
    <div id="auth" className="main">
      <div className="overlay">
        <div className="container">
          <img src="images/logo.svg" className="main-logo" />
          <div className="wrapper">
            <h6 className="main-text">
              1. Login to your mobile app
            </h6>
            <h6 className="main-text">
              2. Enter the following code
            </h6>
            <h6 className="code-text">
              {context.state.otp}
            </h6>
          </div>
          <div className="footer">
            <div>
              <img src="images/qr.png" />
            </div>
            <p>
              Scan and download <br /> Apollo mobile app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const Home = (props) => {

  const [selected, setSelected] = React.useState(null);
  const [focus, setFocus] = React.useState(null);
  const [showPlayer, setShowPlayer] = React.useState(false);
  const context = React.useContext(AppContext);
  console.log(context)
  
  const onFocus = (newIndex) => {
    setFocus(newIndex);
    console.log("focussed")
    setSelected(context.state.playlists[newIndex]);
  }

  const handlePress = (type) => {
    console.log(type, context.state)
    if(context.state?.playlists.length){
      if(type === "right"){
        if(focus === null){
          onFocus(0);
        } else {
          if((focus + 1) < (context.state.playlists?.length)){
            onFocus(focus + 1);
          }
        }
      } else if(type === "left"){
        if(focus === null){
          onFocus(0);
        } else {
          if((focus - 1) >= (0)){
            onFocus(focus - 1);
          }
        }
      } else if(type === "OK") {
        // setShowPlayer(true);
      }
    }
  }

  const onKeyDown = (e) => {
    console.log(props.history?.location?.pathname)
    if(props.history?.location?.pathname === "/Home"){
      switch(e.keyCode){
        case 37: //LEFT arrow
          handlePress("left");
          break;
        case 38: //UP arrow
          console.log("up")
          break;
        case 39: //RIGHT arrow
          handlePress("right");
          break;
        case 40: //DOWN arrow
          console.log("down")
          break;
        case 13: //OK button
          console.log("ok");
          handlePress("OK");
          break;
        case 10009: //RETURN button
          console.log("back")
          break;
        default:
          break;
      }
    }
  }

  React.useEffect(() => {
    socket.send(JSON.stringify(getPlaylistBody));
    // window.addEventListener("keydown", onKeyDown);
    // return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return(
    <div id="home" className="main" tabIndex={0} onKeyDown={onKeyDown}>
      <div className="overlay">
        <div className="container">
          <img src="images/logo.svg" className="main-logo" />
          <div className="wrapper">
            {selected? (
            <React.Fragment>
              <p className="title">{selected.Name}</p>
              <p className="length">{selected.PlaylistItems?.length} ITEM{(selected.PlaylistItems?.length > 1)? "S": ""}</p>
            </React.Fragment>
            ): null}
          </div>
          {(context.state.playlists.length === 0)? (
          <div className="text-wrap">
            <p className="main-text">
              Select a playlist or work to show here...
            </p>
          </div>): (
          <div className="playlist-wrapper">
            <p>
              My Playlists
            </p> 
            <div className="playlist-container">
              {context.state.playlists.map((item, i) => (
                <PlaylistItem
                  key={item.PlaylistId}
                  index={i}
                  item={item}
                  onFocus={onFocus}
                  selected={focus}
                />
              ))}
            </div>
          </div>)}
        </div>
      </div>
      {showPlayer && (
        <Player
          playlist={selected}
        />
      )}
    </div>
  );
}

const PlaylistItem = (props) => {

  let src = "";
  if(
    props.item && props.item.PlaylistItems && props.item.PlaylistItems[0] && props.item.PlaylistItems[0].Works
    && props.item.PlaylistItems[0].Works[0] && props.item.PlaylistItems[0].Works[0].ArtFile
  ){
    src = props.item.PlaylistItems[0].Works[0].ArtFile.FileURL;
    if(props.item.PlaylistItems[0].Works[0].ArtFile.FileType === "video"){
      src = props.item.PlaylistItems[0].Works[0].ThumbnailFile.FileURL;
    }
  }

  return(
    <div
      id={`playlist-${props.index}`}
      className={`playlist-item ${(props.selected === props.index)? "focus": ""}`}
    >
      <img src={src} />
    </div>
  );
}

const Player = (props) => {
  if(!props.playlist){
    return null;
  }

  let type = "image";
  if((props.playlist.ArtFile.FileType === "video")){
    type = "video";
  }

  return(
    <div id="player" className="player">
      {(type === "image")? (
        <img className="now-playing" src={props.playlist.ArtFile.FileURL} />
      ):(
        <video className="now-playing" autoplay loop id="video">
          <source src={props.playlist.ArtFile.FileURL} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

const Controls = (props) => {

  let artist = "";
  let work = "";

  if(props.current.PlaylistItems && (typeof global.index === "number")){
    if(props.current.PlaylistItems[global.index].Works[0].Artists[0]){
      artist = props.current.PlaylistItems[global.index].Works[0].Artists[0].FirstName + " " + props.current.PlaylistItems[global.index].Works[0].Artists[0].LastName;
    }
    work = props.current.PlaylistItems[global.index].Works[0].Name;
  }

  return(
    <div id="controls" className="controls">
      <div className="playlist-wrapper">
        <p className="title">
          {props.current.Name}
        </p>
        <p className="length">
          {props.current.PlaylistItems.length} ITEMS
        </p>
      </div>
      <div className="control-wrapper">
        <div className="control-pad">
          <button class={`duration`} id="control-0">
            Duration
            <span>${Math.floor((global.duration/60)/60)}H: ${Math.floor(global.duration/60)}M</span>
          </button>
          <button className={"play"} id="control-1">
            <img className="play-icon" src="images/pause.svg" />
          </button>
          <button className="shuffle" id="control-2">
            Shuffle
            <span>{global.shuffle? "ON": "OFF"}</span>
          </button>
        </div>
      </div>
      <div className="artist-wrapper">
      <p className="main-text">
        {artist}
      </p>
      <p class="main-text">
        {work}
      </p>
      </div>
    </div>
  )
}

const SocketHandler = ReactRouterDOM.withRouter((props) => {

  const context = React.useContext(AppContext);

  React.useEffect(() => {
    socket.addEventListener("open", function(){
      console.log("socket connected");
      if(!localStorage.getItem("auth")){
        socket.send(JSON.stringify(authBody));
      }
    });
    socket.addEventListener("close", function(e){
      console.log("conn close", e.data);
    });
    socket.addEventListener("message", function(message){
      const action = messageHandler(message.data);
      console.log("ACTION", action)
      if(action){
        context.dispatch(action);
      }
    });
    const timer = setupPing();
    return () => clearInterval(timer);
  }, []);

  return null;
});

// Layout

const App = () => {

  return(
    <Provider>
      <ReactRouterDOM.HashRouter>
        <ReactRouterDOM.Route
          path="/"
          exact
          component={Splash}
        />
        <ReactRouterDOM.Route
          path="/auth"
          exact
          component={Auth}
        />
        <ReactRouterDOM.Route
          path="/home"
          exact
          component={Home}
        />
        <SocketHandler />
      </ReactRouterDOM.HashRouter>
    </Provider>
  );
}

const dom = document.getElementById("root");
ReactDOM.render(
  <App />,
  dom
);
