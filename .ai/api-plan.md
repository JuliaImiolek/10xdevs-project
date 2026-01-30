# REST API Plan

## 1. Resources

- **Users**
- `Database Table`: `users`
- Managed through Supabase Auth; operations such as registration and login may be handled via Supabase or custom endpoints if needed.

- **Generations**: Represents the `generations` table which stores records of generated content. This resource includes metadata, status, and results of AI generation requests (e.g. `model`, `generated_count`, `source_text_hash`, `source_text_length, `generation_duration`).
- 

- **Flashcards**: Corresponds to the `flashcards` table. This resource holds data for individual flashcards, including front, back, and any categorization or status information.
- field include: `id`, `front`, `back`, `source`, `crated_at`, `updated_at`, `generation_id`, `user_id`.

- **Generation Error Logs**: Maps to the `generation_error_logs` table. This resource is used to record errors that occur during AI generation, capturing error messages, timestamps, and related metadata.

## 2. Endpoints

Each resource will support standard CRUD operations along with additional endpoints to support pagination, filtering, and sorting where applicable.

### Generations

- **GET `/generations`**
  - **Description**: Retrieves a list of generation records for the authentiated user.
  - **Query Parameters**: `page` (number), `limit` (number), `sort` (e.g. by date or status), `filter` (criteria based on metadata).
  - **Response**: JSON object containing an array of generation records and pagination metadata.
  - **Success Codes**: 200 OK
  - **Error Codes**: 400 for invalid parameters, 500 for server errors.

- **GET  `/generations/{id}`**
  - **Description**: Retrieves a specific generation record by its ID.
  - **Response**: JSON object representing the generation record.
  - **Success Codes**: 200 OK
  - **Error Codes**: 404 if the record does not exist.

- **POST `/generations`**
  - **Description**: Initiates the AI generation process for flashcards proposals from user-provided text.
  - **Request Body**: JSON payload containing fields such as `content`, `metadata` (for additional parameters), and any optional settings. For example:

    ```json
    {
      "source_text": "User provided text (100 to 10000 characters)",
    }
    ```
  - **Business Logic**: The endpoint validates that the `source_text` field is not empty and meets minimum and maximum length requirements. Call the AI serice to generate flashcards proposals. Store the generation metadata and return flashcards proposals to the user.
  - **Response**: Example response JSON:

    ```json
    {
      "generation_id": 101,
      "flashcards_proposals": [
        {
          "id": 1,
          "front": "Question 1",
          "back": "Answer 1",
          "source": "ai-full",
        }],
        "generated_count": 5
    }
    ```
  - **Success Codes**: 201 Created
  - **Error Codes**: 400 if validation fails. 599: AI service errors (logs recorded in `generation_error_logs`.)

### Flashcards

- **GET /`flashcards`**
  - **Description**: Retrieves a paginated, filtered, and sortable list of flashcards for the authenticated user.
  - **Query Parameters**: `page`, `limit`, `sort`, `order` (e.g., by category or creation date).
  - **Response JSON**: 
  ```json
  {
    "data":[
      { "id": 1, "front": "Qouestion", "back": "Answer", "source": "manual", "created_at": "...", "updated_at": "..."}
    ],
    "pagination": { "page": 1, "limit": 10, "total": 100 }
  }
  ```

  - **Success Codes**: 200 OK
  - **Errors**: 401 Unathorized if token is invalid.

- **GET `/flashcards/{id}`**
  - **Description**: Retrieves details a specific flashcard by its ID.
  - **Response**: JSON object representing the flashcard.
  - **Success Codes**: 200 OK
  - **Error Codes**: 404 if the flashcard does not exist., 401 Unauthorized.

- **POST `/flashcards`**
  - **Description**: Creates one or more flashcards. This endpoint supports bulk creation and is also used for AI-generated flashcards (both full and edited variants).
  - **Request Body**: JSON payload with a `flashcards` array. Each flashcard in the array should contain fields such as `front`, `back` and `source`

    ```json
    {
      "flashcards": [
        {
          "front": "Question 1",
          "back": "Answer 1",
          "source": "manual",
          "generation_id": null
        },
        {
          "front": "Question 2",
          "back": "Answer 2",
          "source": "ai-full",
          "generation_id": 123
        }
      ]
    }
    ```
  - **Response**: Example response:

    ```json
    {
      "flashcards": [
        {
          "id": 1,
          "front": "Question 1",
          "back": "Answer 1",
          "source": "manual",
          "generation_id": null,
          "created_at": "2026-01-30T12:00:00Z"
        },
        {
          "id": 2,
          "front": "Question 2",
          "back": "Answer 2",
          "source": "ai-full",
          "generation_id": 123,
          "created_at": "2026-01-30T12:00:05Z"
        }
      ]
    }
    ```
  - **Validation**: Each flashcard must have non-empty `front` (maximum length: 200 characters) and `back` (maximum legth: 500 characters) fields. The `source` field is required and must be one of `manual`, `ai-full`, or `ai-edited`. If `source` is set to an AI variant (`ai-full` or `ai-edited`), `generation_id` required for `ai-full` and `ai-edited` sources, must be null or `manual` source.
  - **Success Codes**: 201 Created
  - **Error Codes**: 400 if validation fails.

- **PUT `/flashcards/{id}`**
  - **Description**: Updates an existing flashcard.
  - **Request Body**: JSON payload with the updated information.
  - **Response**: JSON object representing the updated flashcard.
  - **Validation**: 
    - `front` maximum length: 200 characters.
    - `back` maximum length: 500 characters.
    - `source`: Must be one of `ai-edited` or `manual`
  - **Success Codes**: 200 OK
  - **Error Codes**: 400 for validation errors, 404 if the flashcard does not exist.

- **DELETE `/flashcards/{id}`**
  - **Description**: Deletes a flashcard.
  - **Response**: JSON message confirming deletion.
  - **Success Codes**: 200 OK or 204 No Content
  - **Error Codes**: 404 if the flashcard does not exist.

### Generation Error Logs

- **GET `/generation-error-logs`**
  - **Description**: Retrieveserror logs for AI flashcards generation for the authenticated user or admin.
  - **Response**: JSON object containing an array of error log entries.
  - **Success Codes**: 200 OK
  - **Error Codes**: 401 Unathorized if token is invalid, 403 Forbidden if access is restricted to admin users.

## 3. Authentication and Authorization

- **Authentication**: The API will utilize token-based authentication using JSON Web Tokens (JWT). Clients must include a valid JWT in the `Authorization` header for protected endpoints.
- **Authorization**: Role-based access control will be implemented to restrict access to certain endpoints (e.g., deletion or update of resources may be limited to admin users).
- **Security Practices**: HTTPS will be enforced, and rate limiting strategies (e.g., 100 requests/minute per user) will be in place to limit abuse.

## 4. Validation and Business Logic

- **Validation**:
  - All incoming data will be validated against the required schema as defined in the database. This includes type checks, required fields, and format validations.
  - Custom validations such as input length, proper formatting of emails, and logical constraints will be enforced in the request handlers.
  - Database-level validations (e.g., unique constraints, foreign key integrity) will be reflected in API error responses.

- **Business Logic**:
  - **Data Integrity**: When performing create or update operations, transactions will be used to ensure data consistency across related records.
  - **Error Handling**: In scenarios where generation fails, an error log will be created in the `generation_error_logs` table. Immediate feedback will be returned to the client with appropriate error messages.
  - **Pagination, Filtering, and Sorting**: List endpoints will support these operations to ensure efficient data retrieval.
  - **Mapping Business Logic to Endpoints**: CRUD operations directly map to the underlying database actions, while additional operations (e.g., error logging, bulk updates) will have dedicated endpoints or integrated middleware handling.
  - **Rate Limiting and Security**: Implement middleware to enforce rate limits and monitor abusive patterns.
