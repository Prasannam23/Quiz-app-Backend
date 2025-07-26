import cluster from 'cluster';
import os from 'os';
import { initializeWorkerApp } from './app'; 

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(` Primary process ${process.pid} is running`);
  console.log(` Forking ${numCPUs} workers...\n`);

  for (let i = 0; i < 2; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker,) => {
    console.log(` Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {
  initializeWorkerApp(process.pid%8000).catch(err => {
    console.error(`Worker ${process.pid} failed to initialize:`, err);
  });
}
