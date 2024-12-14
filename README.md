# Microservices Project Manager System

## 📋 **System Overview**  

This repository implements a **project management system** based on microservices with integrated payment processing. The system is designed to be **resilient**, **scalable**, and **maintainable**, following recommended patterns and practices in distributed architectures.

## ⚙️ **Core Services**  

- **API Gateway**  
  - Central entry point for client requests.  
  - Handles **routing**, basic validation, authentication, and **rate limiting**.

- **Auth Service**  
  - Manages **user authentication and authorization**.

- **Project Service**  
  - Manages the **creation and administration** of projects.

- **Payment Service**  
  - Processes **payments** related to projects.

- **Logging Service**  
  - Centralized system for **logging and monitoring**.

---

## 📐 **Design Patterns Implemented**

🧩 **1. SAGA Pattern**  
Ensures data consistency across distributed transaction workflows.  

**Workflow:**  
1. Client initiates project creation.  
2. **Project Service** creates a pending project.  
3. **Payment Service** processes the payment.  
4. **Success**: The project is activated.  
5. **Failure**: The project is deleted (*compensation logic*).

**Key Components:**  
- **Saga Manager**: Coordinates transaction steps.  
- **Compensation Logic**: Handles rollbacks in case of failures.  
- **Status Tracking**: Monitors transaction status.

🔌 **2. Circuit Breaker Pattern**  
Handles service failures gracefully to prevent **cascading failures**.

**Configuration:**  
- **Timeout**: 3000ms  
- **Error Threshold**: 5 failures  
- **Reset**: 30 seconds  

🚪 **3. API Gateway Pattern**  
Centralizes request management for microservices.

**Features:**  
- Request routing  
- Authentication middleware  
- Rate limiting  
- Error handling  

---

## 🛠️ **Service Details**

🔑 **Auth Service**  
- **Responsibility**: Authentication and authorization.  
- **Features**:  
   - User registration.  
   - Login with **JWT**.  
   - Token validation.  

📁 **Project Service**  
- **Responsibility**: Project management.  
- **Features**:  
   - **CRUD operations** for projects.  
   - Coordination of the **SAGA pattern**.  
   - Integration with **Payment Service**.  

💳 **Payment Service**  
- **Responsibility**: Payment processing.  
- **Features**:  
   - Payment processing.  
   - Payment status tracking.  
   - Integration with **Project Service**.  

📝 **Logging Service**  
- **Responsibility**: Centralized logging.  
- **Technology**: Fluentd.  
- **Features**:  
   - **Real-time log aggregation**.  
   - Web interface for visualization.  
   - Multi-service log collection.  

---

## 🏗️ **Infrastructure**

🐳 **Containerization**  
- **Docker**: Containers for each service.  
- **Docker Compose**: Local development.  
- **Kubernetes**: Production deployment.  

🗄️ **Database**  
- **PostgreSQL**: Independent database for each service.  
- **Logs**: Local storage for logs.  

🔄 **Communication**  
- **REST APIs**: **Synchronous** communication.  
- **Event-Driven**: **Asynchronous** operations.  

# 🚀 Deployment Guide

## Prerequisites
- Docker and Docker Compose installed
- Kubernetes cluster (for K8s deployment)
- Git

## Local Deployment with Docker Compose

1. Clone the repository:
```bash
git clone https://github.com/Kvel12/Project_Manager-DS3.git
cd Project_Manager-DS3
```

2. Build the services:
```bash
docker-compose build
```

3. Start the services:
```bash
docker-compose up -d
```

4. Monitor the services:
```bash
docker-compose logs -f
```

5. Access the application:
- API Gateway: http://localhost:80
- Centralized Logging Dashboard: http://localhost:3005

## Kubernetes Deployment

1. Clone the repository (if not already done):
```bash
git clone https://github.com/Kvel12/Project_Manager-DS3.git
cd Project_Manager-DS3
```

2. Prepare the node storage (required for persistent volumes):
```bash
ssh node01
sudo mkdir -p /mnt/data/{auth-db,project-db,payment-db}
sudo chmod -R 777 /mnt/data/
exit
```

3. Apply Kubernetes configurations:
```bash
kubectl apply -f k8s-config.yml
```

4. Monitor the deployment:
```bash
kubectl get pods -w
```

5. Wait for all services to be in Running state. You can check the status with:
```bash
kubectl get pods
kubectl get services
```

6. Access the services:
- API Gateway: http://[node-ip]:30000
- Centralized Logging Dashboard: http://[node-ip]:30005 or http://10.0.0.10:30005

## Verify Deployment

For both deployment methods, you can verify the system is working by:

1. Checking service health:
```bash
# For Docker Compose
curl http://localhost/health

# For Kubernetes
curl http://[node-ip]:30000/health
```

2. Monitoring logs:
- Docker Compose: Access the Logging Dashboard at http://localhost:3005
- Kubernetes: Access the Logging Dashboard at http://10.0.0.10:30005

## Troubleshooting

If services fail to start:

1. Check service logs:
```bash
# Docker Compose
docker-compose logs [service-name]

# Kubernetes
kubectl logs [pod-name]
```

2. Verify all required ports are available
3. Ensure all persistent volume directories exist and have proper permissions
4. Check that all required environment variables are set correctly

## Cleanup

To stop and remove all resources:

```bash
# Docker Compose
docker-compose down -v

# Kubernetes
kubectl delete -f k8s-config.yml
```

## 🛡️ **Technologies Used**  
- **Backend**: Node.js, Express  
- **Authentication**: JWT  
- **Databases**: PostgreSQL  
- **Containers**: Docker, Kubernetes  
- **Logging**: Fluentd  
- **Communication**: REST, Event-driven (messaging)

---
# Test Strategy

The testing strategy covers multiple layers of the application to ensure reliability and correctness.

## 1.1 Unit Tests

### Auth Service Tests: 4 tests
- User registration validation
- Login authentication
- Token handling
- Error scenarios

### Project Service Tests: 4 tests
- Project creation validation
- Error handling
- Data validation
- Status management

### Payment Service Tests: 4 tests
- Payment processing
- Validation rules
- Error handling
- Status updates

## 1.2 Integration Tests

### Auth Integration: 5 tests
- User registration flow
- Login process
- Token validation
- Duplicate user handling
- Invalid credentials

### Project Integration: 3 tests
- Project creation
- Project listing
- Invalid data handling

### SAGA Integration: 3 tests
- Successful project creation with payment
- Payment failure and rollback (currently failing - timeout issue)
- Concurrent transactions

# 2. Test Results

## 2.1 Test Coverage
- Total Test Suites: 6
- Total Tests: 23
- Tests Passed: 22
- Tests Failed: 1
- Code Coverage: 100%

## 2.2 Known Issues

### SAGA Integration Test Timeout:
- **Test**: "Should rollback project creation on payment failure"
- **Issue**: Test exceeds 60-second timeout
- **Impact**: Non-critical, functionality works but test needs adjustment
- **Recommendation**: Extend timeout or optimize rollback process

# 3. Test Environment

## 3.1 Setup
- Test service runs independently
- Waits for all services to be available
- Uses clean database state for each test

## 3.2 Dependencies
- All microservices must be running
- Databases must be initialized
- Network connectivity between services

# 4. Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## 👥 **Contributors**  
- Kevin Velez
- Juan Cifuentes
- Miguel Moreno
- José Palma
- Yhan Carlos Trujillo
- Brayan Urrea
- David Urrego

