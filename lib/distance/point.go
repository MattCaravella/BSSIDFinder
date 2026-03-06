package distance

import "math"

type Point struct {
	Id                 string  `json:"id"`
	X                  float64 `json:"x"`
	Y                  float64 `json:"y"`
	Alt                float64 `json:"alt"`
	HorizontalAccuracy float64 `json:"h_acc"`
	VerticalAccuracy   float64 `json:"v_acc"`
	Speed              float64 `json:"speed"`
	Course             float64 `json:"course"`
	Timestamp          int64   `json:"timestamp"`
	Floor              int64   `json:"floor"`
	Source             string  `json:"source"`
	SSID               string  `json:"ssid"`
}

func (p *Point) Distance(d Point) float64 {
	return math.Abs(p.X-d.X) + math.Abs(p.Y-d.Y)
}

func Closest(point Point, points []Point) Point {
	var closest Point
	var closestDistance float64 = math.MaxFloat64
	for _, p := range points {
		distance := point.Distance(p)
		if distance < closestDistance {
			closest = p
			closestDistance = distance
		}
	}
	return closest
}

func Closer(target, point1, point2 *Point) *Point {
	if target == nil {
		panic("target cannot be nil")
	}
	if point1 == nil {
		return point2
	} else if point2 == nil {
		return point1
	}
	if target.Distance(*point1) < target.Distance(*point2) {
		return point1
	}
	return point2
}
