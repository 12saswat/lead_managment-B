import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

const app = express();

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "developement"
        ? "http://localhost:3000"
        : "https://ipr-01250601001-f.vercel.app",
    credentials: true,
  })
);
app.use(
  express.json({
    limit: "10mb",
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);
app.use(express.static("public"));
app.use(cookieParser());

// Import Routes and State it's Functions in Try Catch Block
import userRouter from "./routes/user.routes.js";
try {
  app.use("/api/v1/user", userRouter);
} catch (error) {
  console.log("File: app.js", "Line 35:", error);
  throw new Error("Error Occured in Routes", error);
}

import workerRouter from "./routes/worker.routes.js";
try {
  app.use("/api/v1/worker", workerRouter);
} catch (error) {
  console.log("File: app.js", "Line 44:", error);
  throw new Error("Error Occured in Routes", error);
}
// Import Manager Routes and State it's Functions in Try Catch Block
import managerRouter from "./routes/manager.routes.js";
try {
  app.use("/api/v1/manager", managerRouter);
} catch (error) {
  console.log("File: app.js", "Line 52:", error);
  throw new Error("Error occurred in manager routes", { cause: error });
}
// Import manager Seed Routes and State it's Functions in Try Catch Block
import seedRoutes from "./routes/manager.seed.routes.js";
try {
  app.use("/api/v1/seed", seedRoutes);
} catch (error) {
  console.log("File: app.js", "Line 60:", error);
  throw new Error("Error occurred in seed routes", { cause: error });
}

export default app;
