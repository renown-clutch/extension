import { mount } from "svelte";
import "./popup.css";
import App from "./Popup.svelte";

const app = mount(App, {
  target: document.getElementById("popup")!,
});

export default app;
