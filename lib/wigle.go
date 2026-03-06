package lib

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/acheong08/apple-corelocation-experiments/lib/distance"
	"net/http"
	"net/url"
)

type wigleResponse struct {
	Success      bool           `json:"success"`
	TotalResults int            `json:"totalResults"`
	Results      []wigleNetwork `json:"results"`
}

type wigleNetwork struct {
	Netid   string  `json:"netid"`
	SSID    string  `json:"ssid"`
	Trilat  float64 `json:"trilat"`
	Trilong float64 `json:"trilong"`
	Channel int     `json:"channel"`
	Type    string  `json:"type"`
}

func queryWiGLE(apiURL, apiName, apiToken string) ([]distance.Point, error) {
	if apiName == "" || apiToken == "" {
		return nil, errors.New("WiGLE credentials required")
	}

	req, err := http.NewRequest(http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(apiName, apiToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, errors.New("WiGLE request failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		return nil, errors.New("WiGLE authentication failed")
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("WiGLE API error: %s", http.StatusText(resp.StatusCode))
	}

	var result wigleResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, errors.New("failed to parse WiGLE response")
	}

	points := make([]distance.Point, len(result.Results))
	for i, n := range result.Results {
		points[i] = distance.Point{
			Id:     n.Netid,
			Y:      n.Trilat,
			X:      n.Trilong,
			Source: "WiGLE",
			SSID:   n.SSID,
		}
	}
	return points, nil
}

func SearchWiGLE(lat, long float64, apiName, apiToken string) ([]distance.Point, error) {
	delta := 0.005
	apiURL := fmt.Sprintf(
		"https://api.wigle.net/api/v2/network/search?latrange1=%f&latrange2=%f&longrange1=%f&longrange2=%f",
		lat-delta, lat+delta, long-delta, long+delta,
	)
	return queryWiGLE(apiURL, apiName, apiToken)
}

func SearchWiGLEBySSID(ssid, apiName, apiToken string) ([]distance.Point, error) {
	if ssid == "" {
		return nil, errors.New("SSID is required")
	}
	apiURL := "https://api.wigle.net/api/v2/network/search?ssidlike=" + url.QueryEscape(ssid)
	return queryWiGLE(apiURL, apiName, apiToken)
}

func SearchWiGLEByBSSID(bssid, apiName, apiToken string) ([]distance.Point, error) {
	if bssid == "" {
		return nil, errors.New("BSSID is required")
	}
	apiURL := "https://api.wigle.net/api/v2/network/search?netid=" + url.QueryEscape(bssid)
	return queryWiGLE(apiURL, apiName, apiToken)
}
