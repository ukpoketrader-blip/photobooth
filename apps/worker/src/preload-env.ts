/** Load root .env before any other imports that read process.env */
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const rootEnv = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}
