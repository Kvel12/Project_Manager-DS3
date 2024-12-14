const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Función para asegurar que los directorios existan
const ensureDirectories = async () => {
  const baseDir = '/fluentd/log';
  const directories = [
    '/buffer/auth',
    '/buffer/other',
    '/services/auth-service',
    '/services/other'
  ];

  for (const dir of directories) {
    const fullPath = path.join(baseDir, dir);
    try {
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`Directory created: ${fullPath}`);
    } catch (error) {
      console.error(`Error creating directory ${fullPath}:`, error);
    }
  }
};

async function findLogFiles() {
  try {
    // Lista de todos los servicios y sus directorios buffer
    const services = {
      'auth': 'auth-service',
      'project': 'project-service',
      'payment': 'payment-service',
      'gateway': 'api-gateway',
      'other': 'other'
    };
    
    const baseDir = '/fluentd/log/buffer';
    let allFiles = [];
    
    for (const [bufferDir, serviceName] of Object.entries(services)) {
      try {
        const dirPath = path.join(baseDir, bufferDir);
        const files = await fs.readdir(dirPath);
        
        const bufferFiles = files
          .filter(file => file.startsWith('buffer.'))
          .map(file => ({
            path: path.join(dirPath, file),
            service: serviceName
          }));

        allFiles = allFiles.concat(bufferFiles);
      } catch (error) {
        console.error(`Error reading directory ${bufferDir}:`, error);
      }
    }

    console.log('Found buffer files:', allFiles);
    return allFiles;
  } catch (error) {
    console.error('Error in findLogFiles:', error);
    return [];
  }
}

async function readLogFile(fileInfo) {
  try {
    console.log(`Reading file: ${fileInfo.path} for service: ${fileInfo.service}`);
    const content = await fs.readFile(fileInfo.path, 'utf-8');
    
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          const parsed = JSON.parse(line);
          return {
            ...parsed,
            message: parsed.message || line,
            timestamp: parsed.timestamp || new Date().toISOString(),
            level: parsed.level || 'info',
            service: fileInfo.service
          };
        } catch (e) {
          console.error('Error parsing line:', e);
          return {
            message: line,
            timestamp: new Date().toISOString(),
            level: 'info',
            service: fileInfo.service
          };
        }
      });
  } catch (error) {
    console.error(`Error reading file ${fileInfo.path}:`, error);
    return [];
  }
}

async function getLogs() {
  try {
    const files = await findLogFiles();
    const logs = {
      'auth-service': [],
      'project-service': [],
      'payment-service': [],
      'api-gateway': [],
      'other': []
    };

    for (const fileInfo of files) {
      const entries = await readLogFile(fileInfo);
      if (entries.length > 0) {
        logs[fileInfo.service].push(...entries);
      }
    }

    // Ordenar y limitar logs
    Object.keys(logs).forEach(service => {
      logs[service].sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateB - dateA;
      });
      logs[service] = logs[service].slice(0, 1000);
    });

    return logs;
  } catch (error) {
    console.error('Error getting logs:', error);
    return {
      'auth-service': [],
      'project-service': [],
      'payment-service': [],
      'api-gateway': [],
      'other': []
    };
  }
}


app.get('/', async (req, res) => {
  try {
    const logs = await getLogs();
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Centralized Logging Dashboard</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .service-box { 
              border: 1px solid #ddd; 
              padding: 15px; 
              margin-bottom: 15px;
              border-radius: 4px;
              background: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .log-container {
              max-height: 500px;
              overflow-y: auto;
              margin-top: 15px;
              border: 1px solid #eee;
              border-radius: 4px;
            }
            .log-entry {
              background: #f8f9fa;
              padding: 12px;
              margin: 8px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 13px;
              border-left: 4px solid #007bff;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .error { border-left-color: #dc3545; }
            h2 { color: #333; margin-top: 0; }
            .status { 
              display: inline-block;
              padding: 5px 10px;
              border-radius: 3px;
              color: white;
              background: #28a745;
            }
            .refresh-btn {
              padding: 8px 16px;
              background: #007bff;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              margin-left: 10px;
            }
            .refresh-btn:hover {
              background: #0056b3;
            }
            .service-title {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
            }
            .no-logs {
              color: #666;
              font-style: italic;
              padding: 15px;
            }
            .log-count {
              font-size: 0.9em;
              color: #666;
              margin-left: 10px;
            }
          </style>
          <script>
            function refreshPage() {
              location.reload();
            }
            
            let autoRefresh = false;
            function toggleAutoRefresh() {
              autoRefresh = !autoRefresh;
              const btn = document.getElementById('autoRefreshBtn');
              btn.textContent = autoRefresh ? 'Disable Auto-Refresh' : 'Enable Auto-Refresh';
              btn.style.background = autoRefresh ? '#dc3545' : '#28a745';
              
              if (autoRefresh) {
                window.refreshInterval = setInterval(refreshPage, 5000);
              } else {
                clearInterval(window.refreshInterval);
              }
            }
          </script>
        </head>
        <body>
          <div class="container">
            <h1>Centralized Logging Dashboard</h1>
            
            <div class="service-box">
              <div class="service-title">
                <h2>System Status</h2>
                <div>
                  <button id="autoRefreshBtn" class="refresh-btn" style="background: #28a745" onclick="toggleAutoRefresh()">
                    Enable Auto-Refresh
                  </button>
                  <button class="refresh-btn" onclick="refreshPage()">Refresh Now</button>
                </div>
              </div>
              <p><span class="status">Active</span></p>
            </div>
            
            ${Object.entries(logs).map(([service, serviceLogs]) => `
              <div class="service-box">
                <h2>${service} <span class="log-count">(${serviceLogs.length} logs)</span></h2>
                <div class="log-container">
                  ${serviceLogs.length > 0 ? 
                    serviceLogs.map(log => `
                      <div class="log-entry ${log.level === 'error' ? 'error' : ''}">
                        ${log.timestamp} [${log.level}] - ${
                          typeof log.message === 'string' ? 
                            log.message : 
                            JSON.stringify(log, null, 2)
                        }
                      </div>
                    `).join('') : 
                    '<p class="no-logs">No logs available</p>'
                  }
                </div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error rendering page:', error);
    res.status(500).send('Error loading logs');
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await getLogs();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching logs' });
  }
});

// Asegurar que los directorios existan antes de iniciar el servidor
async function startServer() {
  try {
    await ensureDirectories();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Logging service is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();