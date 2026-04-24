# MediChain — Sharing & Intelligence Module
### Project Report by Yesh Raj Bhattarai (202422019)

---

## 1. INTRODUCTION

In today's world, when someone goes to a hospital for treatment, all their test reports, prescriptions, diagnoses, and medical history are stored by that hospital. Now, if that same patient goes to a different hospital in another city or even in the same city, the second hospital usually has no idea about the patient's medical history. They have to start from scratch, do the same tests again, ask the same questions and sometimes make treatment decisions without complete information. This is a very common problem and it can sometimes lead to serious consequences for the patient.

The basic reason for this problem is that there is no secure and standard way for hospitals to share patient data with each other. Even if a hospital wants to share data, there are concerns about — Who gave permission? Was the patient informed? How do we make sure the data wasn't changed during transfer? These are all very important questions that don't have simple answers with existing systems.

MediChain is being built to answer all those questions. MediChain is a web-based platform that allows controlled and verified exchange of medical data between hospitals. The key word here is **controlled** i.e. no data moves without the patient's approval and the owning hospital's approval. Every action is logged. Every data transfer is verified using cryptographic techniques like SHA 256. This makes MediChain different from just sharing files over email and helps eliminates traditional methods.

### 1.1. My Contribution

MediChain is a team project being developed by two team members. My teammate is responsible for hospital registration, patient registration, and the storage and management of medical records including file upload and versioning.

My contribution is the sharing and intelligence layer of MediChain. I am responsible for 3 layers which are as follows:

#### 1.1.1. Governance Layer (Core System)

- Consent Management System (CMS)
- Cross-Hospital Record Request Workflow
- Inter-Hospital API Communication Layer
- Token-Based Hospital Verification
- Hash Verification During Record Exchange
- Consent Logs & Access Logs

#### 1.1.2. Security & Trust Layer

- Token-based hospital authentication
- SHA-256 record integrity verification
- Identity validation before record exchange
- Access control enforcement

#### 1.1.3. Intelligence Layer (Core System)

- AI Risk Prediction
- Risk Dashboard

---

### 1.2. General Overview of the Problem

Healthcare system today lack a secure, standardized and consent driven method for sharing medical records between hospitals. When one hospital need a patient's data from another, the exchange often happens through informal channels such as phone calls, printed reports carried by the patient or unsecured emails. These methods are neither structured nor verifiable. Medical data is highly sensitive and without a secure digital method, there is a serious risk of privacy violations, unauthorized access and tampering.

Additionally, there is no reliable system to ensure that patient consent is properly recorded and enforced before data sharing. There is also no mechanism to verify whether the shared data has been altered during sharing, nor a proper audit trail to track who accessed what and when. Without integrity verification and logging, hospitals cannot confidently trust the exchanged data and accountability becomes difficult. Furthermore, most system focus only on storing data rather than intelligently analyzing it to identify high risk patients. All these gaps collectively highlights the need for a secure, consent-driven verifiable and intelligent cross hospital data exchange platform like MediChain.

---

### 1.3. Feasibility Study

I have analyzed my portion of MediChain i.e. sharing and intelligence from four different angles.

#### 1.3.1. Technical Feasibility

All the technologies I am using are well documented and widely supported. Django and Django REST Framework (DRF) are both production-ready frameworks with huge communities. Python is most popular programming languages for both web development and machine learning which is perfect because my project requires both. Libraries like scikit-learn, pandas and numpy are freely available and widely used for ML development.

#### 1.3.2. Economic Feasibility

The entire project is built using free and open source tools like for example Python, Django, MySQL 8.0, PostgreSQL, VS Code, Git/GitHub, Kaggle, Colab all are free. For development and testing, a personal laptop is sufficient. For final deployment, a free-tier cloud instance can be used. So the total cost of the project is essentially zero.

#### 1.3.3. Operational Feasibility

The APIs are designed to be simple and intuitive. Any frontend or mobile app can consume these APIs with proper authentication. The system is role-based so different types of users like hospital admin and patient interact with different parts of the system. While developing, the admin panel provided by Django makes it easy to manage data without needing a custom admin interface.

#### 1.3.4. Time Feasibility

The project is divided into clearly defined modules. Each module has a specific scope which makes it possible to complete them one by one without any confusions. The base APIs of consent module are already completed. The communication layer and security features are in progress. Logging has not yet been started. The AI module is planned for the final phase. These properly managed phases make the project more manageable within the academic timeline.

---

### 1.4. Literature Survey

**Table 1: Literature Survey**

| Authors / Year | Paper Title | Key Contribution / Finding | Research Gap |
|---|---|---|---|
| Selva Priya et al. (2025) | Analysis and Implementation of Security Algorithm for Healthcare Applications | Studied and implemented security algorithm like AES and SHA for protecting patient data in healthcare applications. Showed that combining encryption with hashing gives stronger protection than using either alone. | The study focuses on encryption and hashing separately but does not implement hash-based integrity verification for data shared between different hospitals over API. |
| Jain, D. (2023) | Regulation of Digital Healthcare in India: Ethical and Legal Challenges | Analyzed the legal and ethical challenges of digital healthcare in India. Found that India's healthcare regulations require patient consent before sharing medical data with any third party. Also discussed the Digital Personal Data Protection Act. | The paper identifies the legal need for consent management but does not propose any technical system to enforce or track patient consent digitally. |
| Rachida et al. (2023) | Literature Review: Clinical Data Interoperability Models | Reviewed different models and standards used to share medical data between hospitals. Found that the lack of interoperability between hospital systems causes repeated tests, extra costs and poor patient care. | The paper reviews existing standards but does not provide a working implementation of a consent-driven, token-authenticated API system for cross-hospital data exchange. |
| Islam et al. (2023) | Chronic kidney disease prediction based on machine learning algorithms | Applied several machine learning algorithms including Random Forest, SVM, KNN and Naive Bayes to predict Chronic Kidney Disease using the UCI CKD dataset. Random Forest gave the best accuracy of 98.5%. | The study is a standalone prediction model with no integration into a hospital system. There is no connection between the prediction result and actual patient records or doctor decision-making. |
| Mohanty et al. (2022) | Design of Smart and Secured Healthcare Service Using Deep Learning with Modified SHA-256 Algorithm | Designed a smart healthcare system that uses deep learning combined with a modified SHA-256 algorithm. Showed that SHA-256 can be used not just for passwords but also for verifying the integrity of healthcare data during transmission. | The system is designed for a single hospital environment. It does not address how SHA-256 verification would work when records are exchanged between two separate hospital systems over an API. |
| Halder et al. (2024) | ML-CKDP: Machine learning-based chronic kidney disease prediction with smart web application | Built a complete machine learning system for CKD prediction and also developed a web application where doctors can enter patient values and get a prediction result. Used preprocessing techniques like missing value handling and Min-Max normalization on the UCI CKD dataset. | The web application is independent and not connected to any hospital's patient record system. Doctor must manually enter all values with no connection to existing lab reports or patient history. |

---

### 1.5. Problem Definition

The main problem that MediChain is trying to solve is the lack of a safe, consent driven and verifiable system for sharing medical information between hospitals. Let's dig deeper into smaller, specific problems.

#### 1.5.1. No Standard Cross Hospital Data Sharing

Currently, if hospital A wants to access a patient's records from hospital B, there is no standard way to do it. Sometimes it can also be done over phone calls, sometimes the patient carries the printed reports and sometimes emails are used. None of these methods are secure, trackable or verifiable. A patient's medical data is very sensitive and sharing it through informal channels like mail, messages etc. is a serious privacy concern and security risk.

#### 1.5.2. No Consent Management and Tracking

When the data is being shared informally, there will be no record whether the patient actually gave permission or not. In many countries including India, healthcare regulations require the patient consent report or it must be obtained before sharing medical data with any third party [1]. Without a proper CMS, hospitals are exposed to legal risks and patients are exposed to privacy violations.

#### 1.5.3. No Data Integrity Verification

When medical data travels from one hospital to another, how do we know it hasn't been altered? In digital systems data can be changed either by accident or by a malicious actor. Without a mechanism to verify data integrity, the receiving hospital cannot be sure that what they have received is exactly what was sent. In a healthcare context this is extremely dangerous because wrong data can lead to wrong treatment.

#### 1.5.4. No Audit Trail

There is no way to track who accessed what, when and why. If a hospital accesses a patient's record without proper authorization there is no proper system in place to detect or track this. Audit trails are extremely important in healthcare for forensic investigation if something goes wrong.

#### 1.5.5. No Proactive Risk Detection

Most hospital systems are reactive – meaning they manage data but don't analyze it. A system that can look at patient data and predict who is at high risk of a serious condition (like Chronic Kidney Disease) would be a valuable addition to MediChain. This proactive capability can help doctors make better decisions earlier.

#### 1.5.6. Summary of Problem

At last, the main problem is that cross-hospital medical data exchange today is unstructured, not properly secured, unconsented and untracked. MediChain, especially through sharing and intelligence, directly addresses all of the problems through consent engine, security layer, audit logging and planned AI module.

---

### 1.6. SRS

This section lists the complete requirements for my portion of the MediChain. Requirements are divided into functional requirements which describes what the system should do and non-functional requirements which describes how the system should behave.

#### 1.6.1. Functional Requirements

**R1: Consent Management**

- The system shall allow a hospital to create a consent request targeting a specific patient's record held at another hospital.
- Each consent request must include the requesting hospital, the owning hospital, the patient, the purpose of request, and requested access duration.
- The system shall allow patients to approve or reject consent requests directed at them.
- The system shall allow the owning hospital to approve or reject a consent request.
- The consent status shall automatically be set to APPROVED only when both the patient and the owning hospital have approved.
- The consent status shall be set to REJECTED if either the patient or the owning hospital rejects.
- The system shall provide API endpoints to list all consent requests, filter by sent/received, and view a specific consent request in detail.
- Only the requesting hospital shall be allowed to delete a consent request, and only if it is still PENDING.

**Table 2: APIs of Consent Management Sub Module**

| API | Description |
|---|---|
| POST /api/consent/request/ | Create Consent Request |
| GET /api/consent/view/ | List All Requests |
| GET /api/consent/sent/?hospital_name= | List Requests Sent By My Hospital |
| GET /api/consent/received/?hospital_name= | List Requests Received By My Hospital |
| GET /api/consent/\<consent_id\>/ | Get Single Consent Detail |
| PATCH /api/consent/\<consent_id\>/patient-decision/ | Patient Approve / Reject |
| PATCH /api/consent/\<consent_id\>/hospital-decision/ | Owner Hospital Approve / Reject |
| DELETE /api/consent/\<consent_id\>/ | Delete Consent Request |

**R2: Inter-Hospital Communication**

- The system shall provide an endpoint to initiate a cross-hospital record request after consent is approved.
- The system shall validate that an approved consent exists before releasing any data.
- The system shall provide an endpoint to fetch a medical record using the approved consent ID.
- The system shall simulate record fetching with structured dummy data until real record APIs are integrated.
- All inter-hospital communication requests shall be logged.

**Table 3: APIs of Inter-Hospital Communication Sub Module**

| API | Description |
|---|---|
| POST /api/communication/request-record/ | Initiate Cross-Hospital Record Request |
| GET /api/communication/fetch/\<consent_id\>/ | Fetch Approved Record |
| POST /api/communication/verify-token/ | Verify Hospital API Token |

**R3: Security Verification**

- The system shall provide an endpoint to verify a hospital's API token.
- Hospital API tokens shall be stored securely and validated on every cross-hospital request.
- The system shall provide an endpoint to verify the SHA-256 hash of a transmitted medical record.
- If the hash does not match, the system shall flag the record as potentially tampered and log the event.

**Table 4: APIs of Security Verification Sub Module**

| API | Description |
|---|---|
| POST /api/communication/verify-hash/ | Verify Record Hash Integrity |
| GET /api/communication/logs/ | View Cross-Hospital Access Logs |

**R4: Audit Logging**

- The system should log every consent creation, update, approval, rejection, and deletion.
- The system should log every cross-hospital data access attempt with timestamp and outcome.
- Logs should include the acting hospital or user, the action taken, the affected record, and the timestamp.
- Logs should be viewable through a dedicated API endpoint with filtering support.

**R5: AI Risk Prediction**

- The system shall allow a laboratory assistant to add KFT report values for a patient through a dedicated API endpoint.
- The system shall allow any authenticated doctor to search for a patient by patient ID and view available lab reports.
- If a KFT report exists for the patient, the system shall make a predict button available to the doctor.
- The system shall run a trained Random Forest machine learning model on the KFT report values to predict the risk of Chronic Kidney Disease.
- The prediction result shall include the predicted condition name, confidence percentage, risk level and a suggested action.
- The system shall store every prediction result with the doctor who requested it, the report it was based on, and the timestamp.
- All prediction requests shall be logged in the audit log.

#### 1.6.2. Non-Functional Requirements

**a. Security**

- All API endpoints must be protected by authentication. Unauthenticated requests must receive a 401 Unauthorized response.
- Role-based access control must be enforced. A patient should not be able to access hospital-level endpoints and vice versa.
- Hospital API tokens must not be transmitted in query parameters. They must be in request headers.
- Passwords and tokens must be stored in hashed or encrypted form, never in plain text.

**b. Performance**

- Standard API responses should be delivered within acceptable interactive response thresholds.
- Based on established human-computer interaction guidelines, responses under 400 milliseconds are considered imperceptible delays to the end user.

**c. Reliability**

- The system should be able to handle invalid requests properly with clear error messages rather than crashing.

**d. Maintainability**

- Code should be organized into clearly named Django apps with single responsibilities.
- All code should be well commented so that in future any developer can understand and modify it.
- Business logic should be in serializers, not in views.

---

## 2. PROJECT PLAN

### 2.1. Hardware and Software Requirements

This section outlines all the hardware and software requirements that are needed for developing, testing and deployment of MediChain. Since the entire project is built using open source technologies the overall cost is essentially zero.

**Table 5: Hardware and Software Requirements**

| Category | Item | Details |
|---|---|---|
| Hardware | Processor | Intel Core i5 or above |
| Hardware | RAM | Minimum 8 GB |
| Hardware | Storage | Minimum 256 GB SSD |
| Hardware | Network | Internet connection required for API testing |
| Software | OS | Windows 10 / Ubuntu 22.04 |
| Software | Language | Python 3.11 |
| Software | Framework | Django 6.0.2, Django REST Framework 3.16.1 |
| Software | Database | MySQL 8.0 (Dev), PostgreSQL (Prod) |
| Software | IDE | VS Code |
| Software | Version Control | Git / GitHub |
| Software | ML Libraries | scikit-learn, pandas, numpy |
| Software | API Testing | Postman |
| Software | Others | Django-cors-headers, python-dotenv |

### 2.2. Developmental Requirements

The following tools and environments are specifically needed during the development phase of the project:

- **Python Virtual Environment (venv)** – to keep all project dependencies isolated and avoid any conflicts with system level packages.
- **PostgreSQL Server** – running locally on the development machine during development to store all application data.
- **Postman** – for manually testing all REST API endpoints during development and debugging.
- **Git and GitHub** – for version control and collaboration between both team members. A branch based workflow is followed.
- **Django Admin Panel** – used during development to inspect and manage database entries without the need of building a custom admin interface.
- **VS Code** with extensions like Python, Pylance and REST Client for a better development experience.

### 2.3. Team Structure

MediChain is a team project with two members. The responsibilities are clearly divided so that both members are working on independent modules. There is no overlapping work. The figure below shows the team structure.

> **[Fig 1: Team Structure]** — A diagram showing the team hierarchy. At the top is Samarpan Dahal (202422003). Below, connected by arrows, is Yesh Raj Bhattarai (202422019). To the left of Yesh Raj is Anup Kr. Paswan (External Guide), and to the right is Mr. Vivek Thapa (Internal Guide).

Both members work in the same codebase under a shared GitHub repository. We follow a branch-based workflow where each member works on their own branch and merges to main only after proper review.

### 2.4. Software Development Life Cycle

> **[Fig 2: Agile SDLC Model]** — A cyclic flowchart depicting the Agile SDLC model with the following stages connected in a loop: Project Approval and Planning → Iteration → Release → Post-Iteration Feedback, with internal sub-steps of Iteration Planning → Implementation → Testing feeding back into the Iteration stage.

MediChain will be developed using Agile SDLC model, in which the system will be built step by step through multiple iterations. Project planning will focus on identifying requirements such as secure Electronic Health Record (EHR) management, consent-based data sharing, and data integrity. In each iteration, backend features like EHR creation, SHA-256–based data integrity, authentication, and APIs will be developed and tested. After testing, stable features will be released, and feedback will be used to improve the system in the next iterations.

### 2.5. Gantt Chart

> **[Fig 3: Gantt Chart]** — A Gantt chart spanning February through June with the following tasks listed: Literature Study, System Architecture / UI Wireframes & Design, Dataset Collection & Preprocessing, Model Development & Evaluation, Backend Development (EHR, Consent & Security Modules), Inter-Hospital Secure Data Exchange Implementation, Model Integration, and Testing, Deployment & Documentation. Each task shows estimated time (red) and completed portions (green/lighter shade) across the weekly date columns.

---

## 3. DESIGN STRATEGY FOR THE SOLUTION

### 3.1. Flowchart

> **[Fig 4: Consent Management Flowchart]** — A flowchart showing the full consent and record sharing flow. The Requesting Hospital logs in, accesses the dashboard, and creates a record request (status: PENDING). In parallel, the Patient and the Owner Hospital each log in, view incoming requests, and make an Approve/Reject decision. Both decisions feed into a diamond: "Both Decisions Approved?" If NO → Reject Request. If YES → Verify Consent Validity (1 week) → Fetch Record from Hospital → Verify SHA-256 → Secure Record Transfer → Log Access & Transaction.

### 3.2. Use Case Diagram

> **[Fig 5: Use Case Diagram]** — A UML use case diagram showing the MediChain system boundary with the following actors: Requesting Hospital, Owner Hospital, Patient, Lab Assistant, and Doctor. Use cases inside the boundary include: Register Hospital, Login/Logout, View Hospital Directory, Create Consent Request, Approve/Reject (Patient), Approve/Reject (Hospital), Fetch Record, Verify SHA-256 Hash, Add LAB Report (KFT), Predict CKD Risk, View Audit Log, and Manage Staffs. Lines connect each actor to the relevant use cases.

### 3.3. Sequence Diagram

> **[Fig 6: Sequence Diagram]** — A UML sequence diagram with the following participants/lifelines: Requesting Hospital, MediChain API, Database + Audit Log, Patient, Owner Hospital, Lab Assistant, Doctor. The diagram shows two parallel flows: (1) Consent and record sharing flow — POST /consent/request → Save consent + Log CONSENT_CREATED → 201 PENDING; PATCH /patient-decision (APPROVED) → Update consent + Log PATIENT_APPROVED → 200 OK; PATCH /hospital-decision (APPROVED) → Update consent APPROVED + Log HOSPITAL_APPROVED → 200 OK; GET /fetch-record → Log RECORD_ACCESS_ATTEMPT → Verify SHA-256 Hash → Log HASH_VERIFIED → 200 Medical Record Data. (2) AI/prediction flow (independent, anytime) — POST /lab/kft-report → 201 Created; POST /predict → Run Random Forest Model → Save RiskPrediction + Log PREDICTION_MADE → 200 CKD Risk Result.

### 3.4. Activity Diagram

> **[Fig 7a: Activity Diagram (Lab Report and CKD Risk Prediction Flow)]** — An activity diagram starting with Lab Assistant Login → Add Patient KFT Report (LOG) → Report Saved → Doctor Login → Search Patient ID → Decision diamond: KFT Report Available? If NO → No Predictions (end). If YES → Clicks Predict → AI Model Runs on Patient KFT Values (LOG) → CKD Risk Result to Doctor (LOG) → end.

> **[Fig 7b: Activity Diagram (Consent and Record Sharing Flow)]** — An activity diagram starting with Register Hospital → Login with API Token → View Hospital Directory → Create Consent Request → Log: Consent Created. The flow then branches to two parallel decision diamonds: Hospital Decision? and Patient Decision? If Hospital REJECTED → Log: Hospital REJECTED → Consent Rejected. If Patient REJECTED → Log: Patient REJECTED → Consent Rejected. If both APPROVED → Log: APPROVED (hospital + patient) → Consent Status: APPROVED → Fetch Record by Requesting Hospital → Log: Request Access Attempt → Verify SHA-256 Hash → Decision diamond: Hash Match? If NO → Log: Hash Not Matched → Notify Hospital → Transfer Blocked. If YES → Log: Hash Matched → Secure Record Transfer → end.

---

## 4. DETAILED TEST PLAN

Testing is being done in parallel with development. I have adopted a test-as-you-build approach which means testing will happen in parallel.

### 4.1. Unit Testing

I am using Django's built-in test framework which is based on Python's unittest module. I have written unit tests for all models, serializers and views in the consent app. The tests cover both the things working correctly and things failing as expected.

For the consent management I wrote tests for these possible transition scenarios:

- Test that consent starts in PENDING state when created.
- Test that final_status becomes REJECTED when patient rejects regardless of hospital decision.
- Test that final_status becomes REJECTED when hospital rejects regardless of patient decision.
- Test that final_status becomes APPROVED only when both patient and hospital approve.
- Test that final_status stays PENDING when only one party has approved.

All these tests pass correctly.

### 4.2. API Testing with Postman

I created a Postman collection to test all the API endpoints manually. For each endpoint I test multiple scenarios. Below is a sample of all the testing done:

**Fig 6: API Test Results**

| Endpoint | Scenario | Expected Result | Actual Result |
|---|---|---|---|
| POST /api/consent/request/ | Create with valid data | 201 Created | PASS |
| POST /api/consent/request/ | Create without authentication | 401 Unauthorized | PASS |
| PATCH /api/consent/{id}/patient-decision/ | Patient approves own consent | 200 OK | PASS |
| PATCH /api/consent/{id}/patient-decision/ | Different patient tries to approve | 403 Forbidden | PASS |
| PATCH /api/consent/{id}/hospital-decision/ | Owning hospital approves | 200 OK | PASS |
| PATCH /api/consent/{id}/hospital-decision/ | Requesting hospital tries to approve | 403 Forbidden | PASS |
| GET /api/communication/fetch-record/{id}/ | Fetch with approved consent | 200 OK + dummy data | PASS |
| GET /api/communication/fetch-record/{id}/ | Fetch with pending consent | 403 Forbidden | PASS |
| POST /api/communication/verify-hash/ | Valid hash submitted | 200 OK – Hash Matched | PASS |
| POST /api/communication/verify-hash/ | Tampered data submitted | 200 OK – Hash Mismatch | PASS |

---

## 5. IMPLEMENTATION DETAILS

This section describes the actual implementation work done so far. I will explain the important design choices, how different parts are integrated and some other technical details.

### 5.1. Project Setup

The project is built using Python 3.11 and Django 6.0.2 with djangorestframework (DRF) 3.16.1. To keep all the dependencies isolated, I have created a virtual environment using Python venv module. The database used is PostgreSQL and MySQL 8.0. I also installed Django-cors-headers for handling cross-origin requests.

### 5.2. Consent Management Implementation

The Consent app is the most developed part of my project. Here is the description of how I implemented it.

**Models (ConsentRequest)**

**Table 7: Consent Model**

| Field Name | Data Type |
|---|---|
| consent_id | UUIDField |
| patient_id | CharField(max_length=50) |
| requesting_hospital | CharField(max_length=50) |
| requested_to_hospital | CharField(max_length=50) |
| record_id | CharField(max_length=50, blank=True, null=True) |
| patient_choice | CharField(max_length=10, choices=STATUS_CHOICES) |
| hospital_choice | CharField(max_length=10, choices=STATUS_CHOICES) |
| request_status | CharField(max_length=10, choices=STATUS_CHOICES) |
| created_at | DateTimeField(auto_now_add=True) |
| updated_at | DateTimeField(auto_now=True) |

**Additional Constraints**

**Table 8: Constraint In ConsentRequest**

| Constraint Name | Type | Description |
|---|---|---|
| unique_patient_hospital_request | UniqueConstraint | Ensures a patient cannot have multiple identical requests between the same requesting and requested hospitals. |

**Automated Status Logic**

**Table 9: Automatic Approval**

| Patient Choice | Hospital Choice | Final Status |
|---|---|---|
| APPROVED | APPROVED | APPROVED |
| REJECTED | Any | REJECTED |
| Any | REJECTED | REJECTED |
| Otherwise | Otherwise | PENDING |

**Serializers**

Serializers are the validation and transformation layer between the API requests and the database models, ensuring only valid and permitted data is processed in all the APIs workflow.

**Table 10: Serializers Used**

| Serializer | Purpose | Fields Used |
|---|---|---|
| ConsentRequestSerializer | Used to view complete consent request data in API responses. | All model fields |
| ConsentCreateSerializer | Used to create a new consent request. | patient_id, requesting_hospital, requested_to_hospital, record_id |
| PatientDecisionSerializer | Allows patient to approve or reject the consent request. | patient_choice |
| HospitalDecisionSerializer | Allows the record-owning hospital to approve or reject the request. | hospital_choice |

**Views and Permissions**

The view layer defines the REST API endpoints responsible for managing the consent in the system. These views handle operations such as creating, retrieving, viewing and accessing consent requests. These views interact with serializers and models to process incoming requests and return structured responses.

Permission control is implemented and enforced within the views to maintain the security of consent. Patient can respond to requests through the patient decision endpoints while the hospital that owns the medical record can approve or reject request through the hospital decision endpoints. These actions are only allowed when the consent request status is PENDING, ensuring that once a decision is finalized it cannot be changed ever.

Additionally secure data sharing between hospitals is implemented through the record retrieval endpoint. Medical records are returned in structured JSON format once all four authorization checks pass successfully.

---

## 6. RESULT AND DISCUSSIONS

The consent management sub-module is the most complete and stable part of the *sharing and intelligence* module. All 8 API endpoints are implemented, working and tested. The core of this sub-module is the automated consent state machine built inside the models `save()` method. It automatically calculates the `request_status` based on both parties' decisions without any manual implementation needed.

> **[Fig 8: Consent Request Model]** — A code screenshot showing the Django `ConsentRequest` model class. It defines `consent_id` as a UUIDField, `STATUS_CHOICES` as ('PENDING', 'APPROVED', 'REJECTED'), and fields for `patient_id`, `requesting_hospital`, `requested_to_hospital`, `record_id`, `patient_choice`, `hospital_choice`, `request_status`, `created_at`, and `updated_at`. The `save()` method implements the state machine logic: if both `patient_choice` and `hospital_choice` are 'APPROVED' → set `request_status = 'APPROVED'`; elif either is 'REJECTED' → set `request_status = 'REJECTED'`; else → set `request_status = 'PENDING'`. A `UniqueConstraint` on `['patient_id', 'requesting_hospital', 'requested_to_hospital']` named `'unique_patient_hospital_request'` is defined in the `Meta` class.

The state machine handles all 4 possible combinations correctly. When both patients and hospitals approve, status becomes APPROVED. When either of them rejects status becomes REJECTED without caring about the other's decision. When only 1 party has responded the status stays PENDING which is the default value while creating a consent. The logic is fully verified in unit testing.

A significant improvement done recently is the refactoring of the token authentication into a reusable helper function called `get_hospital_from_token`. This helper extracts the Bearer token from the Authorization header, validates it against the Hospital model developed by the teammate, and returns the verified hospital object. This same helper is now used consistently in both `create_consent` and `fetch_record` instead of duplicating the same code in every view. This makes the codebase cleaner and easier to maintain.

> **[Fig 9: Helper Function]** — A code screenshot of the `get_hospital_from_token(request)` helper function. It retrieves the `Authorization` header, returns `None` with a 401 response if the header is missing or does not start with "Bearer ". It then splits the token, attempts `Hospital.objects.get(api_key=token)`, and catches `Hospital.DoesNotExist` or `ValidationError` to return a 401 "Invalid hospital token" response. On success, it returns the `hospital` object and `None` error.

The `create_consent` endpoint now properly verifies the requesting hospital using this token. The hospital name from the request body is completely ignored and overridden with the name from the verified token. This prevents any hospital from creating a consent request while impersonating another hospital.

> **[Fig 10: Consent Creation]** — A code screenshot of the `create_consent(request)` view decorated with `@api_view(['POST'])`. It calls `get_hospital_from_token(request)` and returns the error if present. It then copies `request.data`, overrides `data['requesting_hospital']` with `hospital.name`, validates with `ConsentCreateSerializer`, saves the consent, and returns the full `ConsentRequestSerializer` data with status 201. On invalid data, it returns `serializer.errors` with status 400.

The `fetch_record` endpoint has a four-step authorization check. It first authenticates the token before even fetching the consent object to make sure it is a legit user. This is an important security decision because it avoids leaking information about whether a consent exists to unauthenticated callers. After authentication, it fetches the consent, checks that it is APPROVED, and then verifies that the authenticated hospital is actually the same hospital that originally requested the record. All four checks must pass before any data is returned.

**Table 11: Automated and Manual Unit Testing**

| Test Category | Total | Passing | Failing |
|---|---|---|---|
| Model Tests | 12 | 12 | 0 |
| Serializer Tests | 8 | 8 | 0 |
| View Tests | 8 | 8 | 0 |
| **Total** | **28** | **28** | **0** |

### 6.1. Known Limitations and Discussions

The `patient_decision` endpoint currently has no token authentication. This is the most critical security gap remaining in the consent module and fixing it is the next immediate priority.

Also, `sent_requests`, `received_requests` and `view_consent` endpoints use query parameters or no authentication at all. These are marked as dev-only in the code and will need proper token authentication before the system can be considered production ready.

A mock SHA-256 hash verification endpoint has been implemented. Full integration depends on the teammate's medical record module which will store the original hash at the time of record creation.

Audit logging is completely not started. Currently there is no record of who accessed what and when which means accountability and forensic tracking is missing.

---

## 7. PROGRESS TILL DATE

The sharing and intelligence module is approximately **40 percent complete**. The consent governance layer is done. The security layer is partially done with the most critical API endpoints secured but still some remaining. The communication layer has a working skeleton but real integration is still pending. Audit logging and AI module have not been started yet.

Audit logging was supposed to start earlier but got pushed slightly behind schedule because fixing and properly securing the consent and communication layer took more time than expected.

### 7.1. Completed

- Consent Management — all 8 APIs fully working and tested
- Automated consent state machine in the model layer
- `get_hospital_from_token` helper — reusable auth function integrated with teammate's Hospital model
- Token authentication on `create_consent` — hospital identity verified, name overridden from token
- Token authentication on `hospital_decision` — only the owning hospital can approve or reject
- Token authentication on `fetch_record` — 4-step authorization check implemented
- `hospital_directory` endpoint — allows any authenticated hospital to discover other registered hospitals
- Validation that `requested_to_hospital` must be a registered hospital in the system
- SHA-256 hash verification endpoint — mock implementation to verify record integrity
- Merged teammate's branch — codebase now uses a unified MySQL database and shared Hospital model
- 28 unit tests — all passing (models, serializers, views)
- Postman collection with manual API testing done

### 7.2. In Progress

- Adding token authentication to `patient_decision` endpoints
- Adding token authentication to `sent_requests` and `received_requests`
- Full inter-hospital communication flow (skeleton exists but depends on teammate's real record module)
- SHA-256 hash generation and verification flow (partially depends on teammate's module)

### 7.3. Summary

The core governance layer which is the most important part of my contribution is working, tested and secured at the basic level. The remaining work is well scoped and the plan for completing it within the academic timeline is realistic.

**Table 12: Project Status**

| Module | Planned Status | Actual Status | Remark |
|---|---|---|---|
| Consent Management APIs | Complete | Complete | On schedule |
| Token Authentication (create/fetch) | Complete | Complete | On schedule |
| Token Auth (decision endpoints) | Complete | Partial | Slight delay |
| SHA-256 Hash Verification | In Progress | Partial | Slight delay |
| Audit Logging | In Progress | Not started | Behind |
| Inter-Hospital Communication | In Progress | Partial | Slight delay |
| AI Risk Prediction | Not Started | Not started | On schedule |
| Testing & Documentation | Ongoing | Ongoing | On schedule |

---

## References

[1] E. Selva Priya, A. K., L. C. and S. Aishwarya, "Analysis and Implementation of Security Algorithm for Healthcare Applications," in SciTePress, 2025.

[2] D. Jain, "Regulation of Digital Healthcare in India: Ethical and Legal Challenges," Healthcare (Basel), 2023.

[3] R. A. Rachida, R. Debauche, S. Mahmoudi and A. Marzak, "Literature Review: Clinical Data Interoperability Models," Information, 2023.

[4] M. A. Islam, M. Z. H. Majumder and M. A. Hussein, "Chronic kidney disease prediction based on machine learning algorithms," Journal of Pathology Informatics, 2023.

[5] M. D. Mohanty, A. Das and M. N. Mohanty, "Design of Smart and Secured Healthcare Service Using Deep Learning with Modified SHA-256 Algorithm," Healthcare (Basel), 2022.

[6] R. K. Halder, M. N. Uddin, M. A. Uddin and et al., "ML-CKDP: Machine learning-based chronic kidney disease prediction with smart web application," Journal of Pathology Informatics, 2024.
