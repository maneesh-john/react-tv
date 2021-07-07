const App = () => {

  const onFocus = () => {
    console.log("focussed");
  }

  const onFocus2 = () => {
    console.log("focussed 2");
  }

  return(
    <div>
      <Focusable onFocus={onFocus}>
        <h1>Hello World</h1>
      </Focusable>
      <Focusable onFocus={onFocus2}>
        <h1>Hello World</h1>
      </Focusable>
    </div>
  );
}

const dom = document.getElementById("root");
ReactDOM.render(
  <SpatialNavigation>
    <App />
  </SpatialNavigation>,
dom
);