# Postman — GET /api/flashcards

## Request

| Pole | Wartość |
|------|--------|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/api/flashcards` |

### Query params (wszystkie opcjonalne)

| Parametr | Typ | Domyślnie | Opis |
|----------|-----|-----------|------|
| `page` | number | `1` | Numer strony (≥ 1) |
| `limit` | number | `20` | Liczba elementów na stronę (1–100) |
| `sort` | string | `created_at_desc` | Sortowanie (patrz niżej) |
| `source` | string | — | Filtr: `manual`, `ai-full`, `ai-edited` |

**Dozwolone wartości `sort`:**
- `created_at`, `created_at_desc`
- `updated_at`, `updated_at_desc`
- `source`, `source_desc`

### Headers

Na ten moment endpoint używa `DEFAULT_USER_ID` — **nie trzeba** ustawiać nagłówków auth.

---

## Przykładowe URL-e

**Podstawowe (domyślna paginacja i sort):**
```
GET http://localhost:3000/api/flashcards
```

**Strona 2, 10 na stronę:**
```
GET http://localhost:3000/api/flashcards?page=2&limit=10
```

**Sortowanie po dacie utworzenia (najstarsze first):**
```
GET http://localhost:3000/api/flashcards?sort=created_at
```

**Tylko fiszki z źródła manual:**
```
GET http://localhost:3000/api/flashcards?source=manual
```

**Kombinacja:**
```
GET http://localhost:3000/api/flashcards?page=1&limit=5&sort=updated_at_desc&source=ai-full
```

---

## Oczekiwane odpowiedzi

### 200 OK (sukces)
```json
{
  "data": [
    {
      "id": 1,
      "front": "Question",
      "back": "Answer",
      "source": "manual",
      "created_at": "2026-01-30T12:00:00Z",
      "updated_at": "2026-01-30T12:00:00Z",
      "generation_id": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

### 400 Bad Request (np. zły `limit`)
```json
{
  "error": "Bad Request",
  "message": "Invalid query parameters",
  "details": {
    "limit": ["Limit must be at most 100"]
  }
}
```

### 401 Unauthorized (brak userId)
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Failed to list flashcards"
}
```

---

## Szybka konfiguracja w Postmanie

1. **New Request** → Method: **GET**.
2. URL: `http://localhost:3000/api/flashcards`.
3. Zakładka **Params** (Query params) — opcjonalnie dodaj:
   - `page` = 1  
   - `limit` = 20  
   - `sort` = created_at_desc  
   - `source` = manual / ai-full / ai-edited  
4. **Send**.

Upewnij się, że `npm run dev` działa (port 3000).
