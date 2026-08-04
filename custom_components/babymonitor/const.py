"""Constants for the Baby Monitor integration."""

DOMAIN = "babymonitor"

CONF_BASE_URL = "base_url"

DEFAULT_SCAN_INTERVAL = 60  # seconds
CONF_SCAN_INTERVAL = "scan_interval"

# Services (see services.yaml for the user-facing schema)
SERVICE_LOG_EVENT = "log_event"
SERVICE_UPDATE_EVENT = "update_event"
SERVICE_DELETE_EVENT = "delete_event"
SERVICE_QUICK_ACTION = "quick_action"
SERVICE_REFRESH = "refresh"

ATTR_CONFIG_ENTRY_ID = "config_entry_id"
ATTR_CHORE_TYPE = "chore_type"
ATTR_DATA = "data"
ATTR_TIMESTAMP = "timestamp"
ATTR_NOTES = "notes"
ATTR_EVENT_ID = "event_id"
ATTR_LABEL = "label"
