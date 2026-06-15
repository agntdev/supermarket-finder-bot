# Supermarket Finder Telegram Bot — DETAILS Document

## SCREENS

### 1. Initial Prompt Screen (State: `initial`)
- **Trigger**: `/start`, `/help`, `/nearby` (if no prior location exists)
- **Message**:
  ```
  Hi! I'll help you find nearby supermarkets.  
  👉 Tap "Share Current Location" to get started, or type an address.
  ```
- **ReplyKeyboard**:
  ```
  [ Share Current Location ]
  ```
- **Transitions**:
  - Location shared → `location_received`
  - Text input → `geocode_input`
  - `/help` → `help_screen`
  - `/nearby` → `location_required` (if no last location exists)
  - `/settings` → `settings_menu`

---

### 2. Geocode Candidates Screen (State: `geocode_candidates`)
- **Trigger**: Ambiguous address input (Nominatim returns >1 candidate)
- **Message Template**:
  ```
  I found multiple locations for "{input}". Please select one:
  {list of candidates with index numbers}
  ```
- **InlineKeyboard**:
  - One button per candidate: `Select [Candidate N]`
  - "Cancel" button to return to `initial`
- **Transitions**:
  - Candidate selected → `location_received` (with chosen coordinates)
  - "Cancel" → `initial`

---

### 3. Search Results Screen (State: `results`)
- **Trigger**: Successful location-based search, `/nearby`, or settings adjustment
- **Message Template**:
  ```
  **{name}**  
  {distance} meters away  
  {address}  
  {opening_hours}  
  ```
- **InlineKeyboard per result**:
  ```
  [ Open in OSM ] [ Directions ] [ Share ]
  ```
- **Post-results controls**:
  ```
  [ +500m Radius ] [ -500m Radius ] [ Open Now: {ON/OFF} ] [ More... ] [ Settings ]
  ```
- **Transitions**:
  - "Open in OSM" → Open URL
  - "Directions" → Generate and open directions link
  - "Share" → Share coordinates
  - "More..." → Load next page of results (same state)
  - "Adjust radius" → Recompute results with new radius (same state)
  - "Open Now: ON/OFF" → Toggle filter and rerun search (same state)
  - "Settings" → `settings_menu`

---

### 4. Settings Menu (State: `settings_menu`)
- **Trigger**: `/settings` or "Settings" button from any results screen
- **Message**:
  ```
  Preferences:
  - Radius: {current_radius} (500m | 1km | 2km | 5km)
  - Max results: {current_max_results} (3 | 5 | 10)
  - Include convenience stores: {yes/no}
  - Open now only: {yes/no}
  ```
- **InlineKeyboard**:
  ```
  [ Radius: 500m ] [ Radius: 1km ] [ Radius: 2km ] [ Radius: 5km ]
  [ Results: 3 ] [ Results: 5 ] [ Results: 10 ]
  [ Include Convenience: {ON/OFF} ]
  [ Open Now: {ON/OFF} ]
  [ Back to Results ]
  ```
- **Transitions**:
  - Preference button clicked → Update user preferences and return to `results`
  - "Back to Results" → `results`

---

### 5. Help Screen (State: `help_screen`)
- **Trigger**: `/help` or "Help" button
- **Message**:
  ```
  🛒 Supermarket Finder Help  
  Use `/start` to begin or share your location.  
  Type an address to search for supermarkets there.  
  Inline mode: @botname [address] to get results in any chat.  
  Adjust settings with `/settings` or the "Settings" button.
  ```
- **InlineKeyboard**:
  ```
  [ Back to Main ]
  ```
- **Transitions**:
  - "Back to Main" → `initial`

---

### 6. Inline Query Results (State: `inline_results`)
- **Trigger**: `@botname [query]` in any chat
- **Response Types**:
  - `InlineQueryResultLocation` for coordinates (if user has shared location)
  - `InlineQueryResultArticle` for detailed results (when query text is provided)
- **Transitions**:
  - Result selected → `results` (in direct chat context)

---

### 7. Error Screen (State: `error`)
- **Trigger**: API failure, invalid input, permission denied
- **Message Variants**:
  - "No supermarkets found within {radius} meters. Try increasing the radius or including convenience stores."
  - "OSM API temporarily unavailable. Try again later."
  - "Location access denied. Please enable permissions to use this feature."
- **InlineKeyboard**:
  ```
  [ Retry ] [ Adjust Settings ] [ Share Location Again ]
  ```
- **Transitions**:
  - "Retry" → Reattempt search (same state)
  - "Adjust Settings" → `settings_menu`
  - "Share Location Again" → `initial`

---

## COMPONENTS

### 1. Geocode Candidate Selector
- **Type**: Inline menu with numbered options
- **Behavior**:
  - Displays up to 5 candidates from Nominatim
  - Buttons labeled `Select [Candidate N]` with associated coordinates
  - "Cancel" returns to initial state

### 2. Result InlineKeyboard
- **Type**: Dynamic per-result buttons
- **Actions**:
  - `osm_url` → Open in OSM
  - `directions` → Generate Google Maps/OSM directions link
  - `share` → Share place coordinates

### 3. Settings Paginator
- **Type**: Inline menu with preference toggles
- **Behavior**:
  - Updates `default_radius`, `default_max_results`, `include_convenience`, `default_open_now` in user preferences
  - "Back to Results" returns to last results screen with updated preferences

### 4. Inline Query Handler
- **Type**: Telegram `InlineQuery` processor
- **Rules**:
  - Empty query → Use last known location (if exists)
  - Text query → Geocode and search
  - Max 50 results (Telegram limit)
  - Prioritize `InlineQueryResultLocation` for location-based queries

### 5. Error Dialog
- **Type**: Inline or direct message
- **Layout**:
  - Error message with actionable buttons
  - "Retry" attempts search again
  - "Adjust Settings" opens settings menu

---

## TRANSITIONS

| Current State | Input/Callback | Next State | Side Effects |
|---------------|----------------|------------|--------------|
| `initial` | `/nearby` | `location_required` | Check for cached last location |
| `initial` | Location shared | `location_received` | Store coordinates, trigger search |
| `initial` | Text input | `geocode_candidates` | Query Nominatim for address candidates |
| `geocode_candidates` | Candidate selected | `location_received` | Use selected coordinates for search |
| `results` | "Open in OSM" | N/A | Open URL in browser |
| `results` | "Directions" | N/A | Generate and open directions link |
| `results` | "More..." | `results` | Load next page of results |
| `results` | "Adjust radius" | `results` | Recompute with new radius |
| `results` | "Open Now: ON/OFF" | `results` | Toggle filter and rerun search |
| `settings_menu` | Preference change | `results` | Update user preferences and rerun search |
| `settings_menu` | "Back to Results" | `results` | Return to last search results |
| `inline_results` | Query executed | `inline_result` | Insert location/article into chat |
| `error` | "Share Location Again" | `initial` | Reset location prompt |

---

## DATA

### Entities

#### 1. User
- `user_id` (Telegram ID)
- `default_radius` (meters, e.g., 1000)
- `default_max_results` (e.g., 5)
- `include_convenience` (bool)
- `default_open_now` (bool)
- `last_location` (lat/lon, TTL 24h)

#### 2. SearchRequest
- `origin` (lat/lon or geocoded address)
- `radius` (meters)
- `max_results` (int)
- `include_convenience` (bool)
- `open_now` (bool)

#### 3. Place
- `osm_id` (unique ID)
- `name` (string)
- `lat`/`lon` (coordinates)
- `distance` (meters)
- `address` (string)
- `opening_hours` (parsed string)
- `osm_url` (string)
- `tags` (JSON map)

#### 4. CachedResponse
- `key` (hash of origin+radius+filters)
- `response` (raw API data)
- `ttl` (1 hour)

---

## Acceptance Notes

### 1. `/nearby` Command Flow
- User sends `/nearby` → Bot checks `last_location` in User entity
- If exists: Run search with last location and current preferences → `results`
- If not: Show error message "No prior location found. Please share your location first." with "Share Location Again" button → `initial`

### 2. Geocode Candidate Selection
- User types "123 Main St" → Nominatim returns 5 candidates → Bot shows `geocode_candidates` screen
- User selects "Candidate 2" → Coordinates used for search → `results` screen displayed

### 3. Location Permission Denied
- User denies location access → Bot shows error message "Location access denied. Please enable permissions to use this feature." with "Retry" and "Adjust Settings" buttons → `error`

### 4. Help Screen Behavior
- User sends `/help` → Bot displays help message with "Back to Main" button → `help_screen`
- Clicking "Back to Main" → Returns to `initial` state

### 5. Settings Adjustments
- User opens `/settings` → Selects "Radius: 2km" and "Open Now: ON" → Preferences updated
- "Back to Results" clicked → Returns to `results` screen with new radius and filter applied

### 6. Inline Query Handling
- User types `@botname` in a group chat → Bot returns up to 50 `InlineQueryResultLocation` items based on last known location
- User types `@botname Tokyo` → Geocodes Tokyo and returns `InlineQueryResultArticle` with top supermarkets

### 7. Caching and Rate Limiting
- Identical search (same origin, radius, filters) → Serve cached results from `CachedResponse`
- Radius/filter changes → Bypass cache and query OSM directly
- Overpass/Nominatim 429 error → Implement exponential backoff (1s, 2s, 4s) and notify admin

---

## Notes for Developer

- Implement `/nearby` command logic to check for `last_location` in User entity
- For geocode ambiguity, show `geocode_candidates` screen with numbered options
- Handle location permission errors explicitly in `error` state transitions
- Define `help_screen` state with structured message and "Back to Main" button
- Add "Back to Results" button to `settings_menu` inline keyboard
- Use `node-opening_hours` to parse and evaluate "open now" status
- For directions, prefer Google Maps links with origin/destination parameters
- Admin alerts must include error type, timestamp, and user context (if available)
- All user-facing strings must be i18n-ready (English first, future localization hooks)