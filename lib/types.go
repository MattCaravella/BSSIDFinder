package lib

type AP struct {
	BSSID    string
	Location Location
}

type Cell struct {
	Tower    TowerInfo
	Location Location
}

type TowerInfo struct {
	Mcc    uint32 `json:"mobileCountryCode"`
	Mnc    uint32 `json:"mobileNetworkCode"`
	CellId uint32 `json:"cellId"`
	TacId  uint32 `json:"locationAreaCode"`
}

type Location struct {
	Long               float64
	Lat                float64
	Alt                float64
	HorizontalAccuracy float64
	VerticalAccuracy   float64
	Speed              float64
	Course             float64
	Timestamp          int64
	Floor              int64
}
