# NEOXI - USE-CASES

This section outlines the primary ways a User can interact with the Neoxi application.

### Dictionary
* **User:** The main individual or system entity that interacts with the application.
* **Artifact:** A file containing information for processing. Supported file types are .txt and text-only .pdf.
* **NLP:** Natural Language Processing, used to interpret the User's text messages.
* **Confidence Score:** A metric used by the AI to determine the accuracy of a proposed category.

## SECTION 1: Account & Profile Management

### CASE 1: User Authentication
The User can create a new account (Sign Up), access an existing
account (Sign In), and securely end their session (Log Out). The
system also provides a mechanism to reset or change the password
for security purposes.

### CASE 2: Account Settings Management
The User can update their profile information, such as their username
and email address, to keep their account details current.

## SECTION 2: Data Entry & AI Analysis

### CASE 3: Submitting Spending Data
The User can input financial data by sending a text message
containing spending details in their native language or by uploading an
Artifact.

### CASE 4: Receiving System Analysis
The System processes the submitted data and returns a response that
includes:

- Spending amounts organized by category.
- Proposals for new spending categories if a detected expense
does not match an existing structure.

*Constraint*: To ensure a smooth UX, the system automatically maps an
expense to an existing category if the AI confidence score is 75% or
higher. It will only propose a new category if it is unsure or if the
expense is truly unique.

### CASE 5: Accepting Categorization
The User reviews and accepts the System’s proposed spending
categorization for the submitted data, which then saves the
transaction to the database.

### CASE 6: Declining and Resending Requests
The User may decline the proposed categorization. In this case, they
can provide additional context or a manual prompt and request a
re-analysis of the data.

### CASE 7: Manual Category Modification
The User can manually override the System’s suggestion and choose a
different spending category from their personal list.

## SECTION 3: Category Management

### CASE 8: Manual Category Creation
The User can create specific, custom categories manually (e.g.,
"Gaming Setup" or "Pet Supplies") to tailor the system to their
personal needs without waiting for an AI suggestion.

### CASE 9: Transaction Correction and Deletion
The User can view their transaction history to remove or revert
specific spending entries that were previously accepted or saved in
error.

## SECTION 4: Reporting & Budgeting

### CASE 10: Spending Review and Report Generation
The User can access a personal dashboard to view and retrieve
spending data. The system allows filtering and reporting based on
user-defined time periods (e.g., weekly, monthly, or yearly).

### CASE 11: Budget Management and Alerts
The User can define overall monthly budget limits and specific limits
for individual categories.

*Functionality*: The LLM analyzes current spending patterns and issues
timely warnings if the User is approaching or exceeding these limits.

## SECTION 5: System Constraints & Error Handling

### CASE 12: Handling Unsupported File Formats
If a User attempts to upload an Artifact in an unsupported format
(anything other than .txt or text-only .pdf), the system must return a
clear error message explaining the requirement.

### Out of Scope (Future Versions):
* **Advanced Optimization:** Proposing specific financial strategies to save money based on spending habits.
* **Complex PDF Parsing:** In-depth scanning of image-based PDFs or complex tables.
