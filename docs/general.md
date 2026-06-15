# Supermarket Finder Telegram Bot — GENERAL Design Document

## Summary
This Telegram bot helps users find nearby supermarkets and convenience stores worldwide by leveraging OpenStreetMap (OSM) data through the Overpass and Nominatim APIs. It supports location sharing, address input, and inline queries, providing a ranked list of up to 5 results within 1 km (configurable) with details like distance, address, opening hours, and map links. Users can customize search parameters (radius, result count, "open now" filter) and receive results via direct chat or inline mode. Designed for travelers and local shoppers needing quick access to grocery locations while respecting OSM's public API usage policies.

## Core Entities
- **User**: Telegram user ID, preferences (default_radius, default_max_results, include_convenience, default_open_now)
- **SearchRequest**: Origin coordinates, radius (meters), max_results, include_convenience (bool), open_now (bool)
- **Place**: OSM ID, name, coordinates, distance (m), address, opening_hours, tags, osm_url
- **CachedResponse**: Key (bbox/coords+radius+filters), OSM API response, TTL (1 hour)

## External Dependencies
- **Telegram Bot API**: 
  - Direct commands: `/start`, `/help`, `/nearby`, `/settings`
  - Inline query handling (`InlineQuery` → `InlineQueryResultLocation`/`Article`)
  - Keyboard interactions (ReplyKeyboard for location sharing, InlineKeyboard for result actions)
- **OpenStreetMap APIs**:
  - **Overpass API**: POI queries for `shop=supermarket`, `shop=convenience`, `amenity=market` (configurable)
  - **Nominatim API**: Forward geocoding for typed addresses, reverse geocoding for ambiguous locations
- **Opening Hours Parser**: Library to evaluate OSM `opening_hours` tags (e.g., `node-opening_hours`)
- **Cache Store**: Redis or in-memory cache with TTL for Overpass/Nominatim responses
- **Admin Monitoring**: Optional Telegram webhook for error alerts and quota notifications

## Full Feature List
- **/start**: Welcome message with location-sharing prompt and settings link
- **Location Sharing**: Accept user-shared GPS coordinates to trigger a search
- **Address Input**: Parse typed addresses via Nominatim and allow selection of ambiguous results
- **/settings**: Configure default radius (500m, 1km, 2km, 5km), max results (3,5,10), toggle convenience store inclusion, and set default "open now" behavior
- **Inline Query Support**: Enable searches from any chat using `@botname` (with optional query text)
- **Dynamic Search Adjustments**: Post-search buttons to increase/decrease radius, toggle "open now", or load more results
- **Result Presentation**:
  - Direct chat: Bolded name, distance, address, opening hours, and inline buttons ("Open in OSM", "Directions", "Share")
  - Inline mode: `InlineQueryResultLocation` for quick insertion, `InlineQueryResultArticle` for detailed cards
- **"Open Now" Filtering**: Real-time evaluation of OSM opening hours using a parser library
- **Graceful No-Results Handling**: Suggest increasing radius, including convenience stores, or verifying address input
- **Caching**: Store Overpass/Nominatim responses for 1 hour (configurable) to reduce API load
- **Rate Limiting**: Enforce 1 request/second to Overpass/Nominatim, with exponential backoff on 429/5xx errors
- **User-Agent Compliance**: Use a descriptive user-agent with contact info for OSM API requests
- **Admin Alerts**: Send critical errors and quota warnings to a configured Telegram admin chat
- **Privacy Compliance**: Avoid long-term storage of GPS coordinates unless explicitly opted in (with 24h TTL)

## Non-Goals
- No grocery delivery or inventory management functionality
- No full navigation/routing capabilities (only directions links)
- No personalization beyond user preferences (e.g., no saved favorites)
- No integration with proprietary mapping services beyond OSM
- No support for non-OSM data sources or commercial APIs
- No multilingual UI beyond initial English implementation (i18n is future scope)

## Persistence Requirements
- **User Preferences**: Store in a lightweight DB (e.g., SQLite, PostgreSQL, or Redis) with fields for `user_id`, `default_radius`, `default_max_results`, `include_convenience`, `default_open_now`
- **CachedResponses**: Keyed by `origin_coords+radius+filters`, stored in Redis with 1-hour TTL
- **Usage Logs**: Optional anonymized metrics (search counts, error rates) for capacity planning
- **Recent Locations**: If opt-in enabled, store last location per user with 24h TTL for quick re-use

## Implementation Notes
- **Default Config**: Radius=1000m, max_results=5, tags=`shop=supermarket`, rate limit=1 req/sec
- **Tech Stack**: 
  - Bot framework: Node.js (Telegraf) or Python (Aiogram)
  - Cache: Redis
  - DB: SQLite/PostgreSQL for user preferences
- **OSM Query Fallback**: If Overpass fails, use Nominatim's POI lookup as a degraded mode
- **Directions Links**: Generate Google Maps or OSM directions URLs using origin and destination coordinates
- **Error Handling**: Retry failed OSM requests with exponential backoff, display user-friendly error messages for API failures

## Deliverables
- Bot codebase with modular architecture for OSM integration, caching, and Telegram handlers
- Configuration files for OSM endpoints, cache settings, and admin channel
- Documentation for setting up user-agent/contact headers and switching to self-hosted/paid OSM providers
- Deployment-ready setup with environment variables for API keys, DB/cache connections, and admin chat ID
- Privacy-compliant data handling (no PII unless explicitly opted in)