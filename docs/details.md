# Supermarket Finder Telegram Bot — DETAILS Document

## SCREENS

### 1. Initial Prompt Screen (State: `initial`)
- **Trigger**: `/start`, `/help`, or new user
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
  - `/settings` → `settings_menu`

---

### 2. Search Results Screen (State: `results`)
- **Trigger**: Successful location geocoding or search
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
  [ +500m Radius ] [ -500m Radius ] [ Open Now: ON/OFF ] [ More... ]
  ```
- **Transitions**:
  - "Open in OSM" → Open URL
  - "Directions" → Generate directions link
  - "Share" → Share location
  - "More..." → Load next page of results
  - "Adjust radius" → Recompute results with new radius
  - "Open Now: ON/OFF" → Toggle filter and rerun search

---

### 3. Settings Menu (State: `settings`)
- **Trigger**: `/settings` or button click
- **Message**:
  ```
  Preferences:
  - Radius: {current_radius}
  - Max results: {current_max_results}
  - Include convenience: {yes/no}
  - Open now only: {yes/no}
  ```
- **InlineKeyboard**:
  ```
  [ Radius: 1km ] [ Results: 5 ] [ Include Convenience: ON ] [ Open Now: OFF ]
  ```
- **Transitions**:
  - Button click → Update preference and return to last screen
  - "Back to results" → `results`

---

### 4. Inline Query Results (State: `inline`)
- **Trigger**: `@botname [query]` in any chat
- **Response Types**:
  - `InlineQueryResultLocation` (map pin) for location-based queries
  - `InlineQueryResultArticle` (detailed card) for typed addresses
- **Transitions**:
  - Result selected → Open in chat with full details

---

### 5. Error Screen (State: `error`)
- **Trigger**: API failure, invalid input, rate limiting
- **Message Examples**:
  - "OSM API temporarily unavailable. Try again later."
  - "No supermarkets found. Try increasing radius."
- **InlineKeyboard**:
  ```
  [ Retry ] [ Adjust Settings ]
  ```

---

## COMPONENTS

### 1. Location Sharing Prompt
- **Type**: `ReplyKeyboard` with single button
- **Behavior**: Disappears after first use; persists until location shared

### 2. Result InlineKeyboard
- **Type**: Dynamic per-result buttons
- **Actions**:
  - `osm_url` → Open in OSM
  - `directions` → Generate Google Maps/OSM link
  - `share` → Share coordinates

### 3. Settings Paginator
- **Type**: Inline menu with radius presets (500m, 1km, 2km, 5km)
- **Behavior**: Updates `default_radius` in user preferences

### 4. Confirmation Dialog
- **Type**: Inline confirmation for destructive actions (e.g., clearing cache)
- **Layout**:
  ```
  [ Confirm ] [ Cancel ]
  ```

### 5. Inline Query Handler
- **Type**: Telegram `InlineQuery` processor
- **Rules**:
  - Empty query → Use last known location
  - Text query → Geocode and search
  - Max 50 results (Telegram limit)

---

## TRANSITIONS

| Current State | Input/Callback | Next State | Side Effects |
|---------------|----------------|------------|--------------|
| `initial` | Location shared | `location_received` | Trigger search |
| `initial` | Text input | `geocode_input` | Show geocoding results |
| `geocode_input` | Select address | `results` | Run search with selected coordinates |
| `results` | "Open in OSM" | N/A | Open URL in browser |
| `results` | "Directions" | N/A | Generate and open directions link |
| `results` | "More..." | `results` | Load next page of results |
| `results` | "Adjust radius" | `results` | Recompute with new radius |
| `settings` | Preference change | `results` | Update user preferences |
| `inline` | Query executed | `inline_result` | Insert location/article into chat |

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

### 1. Location Sharing Flow
- User taps "Share Location" → Bot receives coordinates → Triggers search with default radius (1000m) and max results (5)
- Results include distance, address, opening hours, and map links

### 2. Address Input Flow
- User types "123 Main St" → Bot geocodes via Nominatim → Shows top 5 candidates with "Select" buttons
- Selection triggers search with that location

### 3. Inline Query Handling
- User types `@botname` in a group chat → Bot returns location-based results if location shared
- User types `@botname Paris` → Geocodes Paris and returns nearby supermarkets

### 4. Settings Adjustments
- Changing radius to 2km → Updates `default_radius` and reruns search with new value
- Toggling "Open Now" → Filters results to current time's opening hours

### 5. Error Handling
- OSM API 429 error → Shows "Too many requests. Try again in 5 minutes." with retry button
- No results → Suggest increasing radius or including convenience stores

### 6. Caching Behavior
- Identical searches within 1 hour → Serve cached results
- Radius/filter changes → Bypass cache and query OSM

### 7. Privacy Compliance
- No long-term storage of user locations unless opted in
- All PII anonymized in logs

---

## Notes for Developer

- Use `node-opening_hours` or equivalent library to parse opening hours
- Implement exponential backoff for OSM API retries (1s, 2s, 4s, 8s)
- For inline queries, prioritize location-based results if user has shared location
- Directions links should include origin if available (e.g., `https://www.google.com/maps/dir/?api=1&origin={lat},{lon}&destination={place_lat},{place_lon}`)
- Admin alerts should include error type, timestamp, and affected user (if known)