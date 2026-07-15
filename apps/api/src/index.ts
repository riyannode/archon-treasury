import { loadConfig } from "@archon-treasury/config";
import { createApp } from "./app.js";

const config = loadConfig();
const app = createApp();

app.listen(config.port, () => {
  console.log(
    `[${config.nodeEnv}] Archon Treasury API listening on :${config.port}`,
  );
});
