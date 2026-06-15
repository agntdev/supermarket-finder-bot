# Supermarket Finder Telegram Bot — UX SPEC Document

## COMMAND TREE
| Command        | Description                                                                 |
|----------------|-----------------------------------------------------------------------------|
| `/start`       | Initialize bot session, show welcome message and location-sharing prompt  |
| `/help`        | Display concise help text with available commands and inline query usage  |
| `/nearby`      | Trigger immediate supermarket search using last known location (if exists)|
| `/settings`    | Open preference adjustment menu (radius, results count, filters)            |
| Inline query   | `@botname [address]` — search supermarkets from any chat context            |

## DIALOG STATE MACHINE
**States:**
1. **Initial State**  
   - Shows welcome message with "Share Location" button  
   - Transitions on: `/start`, `/help`, location share, text input  

2. **Location/Address Input**  
   - Awaits GPS share or address text  
   - Transitions on: Location received, address selected from geocoding results  

3. **Search Results**  
   - Displays ranked supermarket list with action buttons  
   - Transitions on: Button clicks (adjust radius, toggle filters), `/settings`  

4. **Settings Adjustment**  
   - Shows preference sliders/toggles  
   - Transitions on: Preference saved, "Back to results"  

5. **Inline Query Mode**  
   - Responds to `@botname` with location-based suggestions or geocoded results  
   - Transitions on: Inline result selected  

**Transitions:**
- Any state → `/settings` opens settings menu  
- Search results → "Adjust radius" updates query parameters and reruns search  
- No results → Suggest increasing radius or including convenience stores  

## INLINE-KEYBOARD LAYOUTS

### 1. Initial Prompt Screen
**ReplyKeyboard:**
```
[ Share Current Location ]
```

### 2. Search Results Screen
**InlineKeyboard per result:**
```
[ Open in OSM ] [ Directions ] [ Share ]
```

**Post-results controls:**
```
[ +500m Radius ] [ -500m Radius ] [ Open Now: ON/OFF ] [ More... ]
```

### 3. Settings Menu
**InlineKeyboard:**
```
[ Radius: 1km ] [ Results: 5 ] [ Include Convenience: ON ] [ Open Now: OFF ]
```

### 4. Inline Query Results
- **Location Result**: `InlineQueryResultLocation` with map pin  
- **Article Result**: `InlineQueryResultArticle` with name/distance/address  

## MESSAGE COPY & TONE

### Welcome Message
```
Hi! I'll help you find nearby supermarkets.  
👉 Tap "Share Current Location" to get started, or type an address.
```

### No Results Found
```
No supermarkets found within {radius} meters. Try:
- Increasing the search radius
- Including convenience stores
- Verifying your location
```

### Result Card Template
```
**{name}**  
{distance} meters away  
{address}  
{opening_hours}  
[ Open in OSM | Directions | Share ]
```

### Settings Confirmation
```
Preferences updated:  
- Radius: {radius}  
- Max results: {count}  
- Include convenience: {yes/no}  
- Open now only: {yes/no}
```

### Inline Query Response
- For location-based: "Supermarkets near you: {list}"  
- For typed query: "Top supermarkets near '{address}': {list}"  

### Error Messages
- **Invalid Address**: "Couldn't find that location. Try a more specific address."  
- **OSM API Down**: "Temporarily unable to fetch data. Please try again in 5 minutes."  
- **Rate Limited**: "Too many requests. Please wait a moment before trying again."  

## EDGE CASES

### Invalid Input
- **Typed address ambiguity**: Show geocoding candidates with "Select this location" buttons  
- **Empty inline query**: Default to location-based results if user has shared location before  

### Timeouts & Failures
- **OSM query timeout**: Show cached results if available, else "No results temporarily"  
- **Google Maps link failure**: Fall back to OSM map link  

### Permission Errors
- **Location access denied**: "Please enable location permissions to use this feature"  
- **Settings without prior search**: Redirect to initial location prompt  

### Empty States
- **First-time user**: Show welcome message with location prompt  
- **No cached results**: Display "Try increasing your search radius" suggestion  

## i18n STRINGS TO LOCALIZE
- All user-facing messages (welcome text, error messages, button labels)  
- Opening hours formatting (e.g., "Open now" vs. "Closed")  
- Unit measurements (meters/km vs. miles)  
- Preference labels ("Radius", "Max results", etc.)  
- Inline query placeholders ("Search supermarkets...")  

**Non-localizable strings:**  
- OSM API endpoints  
- Telegram command paths (/start, /settings)  
- Technical error codes (429, 503)  

--- 
*Document covers all features from GENERAL spec with conversational UX patterns for Telegram bot interactions.*