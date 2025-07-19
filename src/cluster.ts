import cluster from 'cluster';
import os from 'os';
import {server} from './app'; 

const PORT = process.env.PORT || 8000;
const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(` Primary process ${process.pid} is running`);
  console.log(` Forking ${numCPUs} workers...\n`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(` Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {
  server.listen(PORT, () => {
    console.log(`Worker ${process.pid} running on http://localhost:${PORT}`);
  });
}
