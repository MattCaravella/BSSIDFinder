package main

import (
	_ "embed"
	"fmt"
	"github.com/acheong08/apple-corelocation-experiments/lib"
	"github.com/acheong08/apple-corelocation-experiments/lib/distance"
	"log"
	"os/exec"
	"runtime"
	"sync"

	"github.com/a-h/templ"
	"github.com/acheong08/clir"

	"github.com/labstack/echo/v4"
)

//go:embed main.js
var mainJs []byte

func init() {
	log.SetFlags(log.Lshortfile)
}

type gps struct {
	Lat           float64 `json:"lat"`
	Long          float64 `json:"long"`
	WiGLEApiName  string  `json:"wigle_api_name"`
	WiGLEApiToken string  `json:"wigle_api_token"`
}

func main() {
	lat := 39.8283
	long := -98.5795
	var china bool
	cli := clir.NewCli("demo", "Interactive user interface to demonstrate the functionality of Apple's Geolocation services", "v0.0.1")

	cli.WithFlags(
		clir.Float64Flag("lat", "default latitude", &lat),
		clir.Float64Flag("long", "default longitude", &long),
		clir.BoolFlag("china", "use the Chinese API", &china),
	)

	cli.Action(func() error {
		e := echo.New()
		e.GET("/", func(c echo.Context) error {
			return Render(c, 200, Index(lat, long, china))
		})
		e.GET("/main.js", func(c echo.Context) error {
			c.Response().Header().Set("content-type", "application/javascript")
			// Set status code
			c.Response().WriteHeader(200)
			_, err := c.Response().Write(mainJs)
			return err
		})
		e.POST("/gps", func(c echo.Context) error {
			var g gps
			if err := c.Bind(&g); err != nil {
				return c.String(400, "Bad Request")
			}
			if g.Lat < -90 || g.Lat > 90 || g.Long < -180 || g.Long > 180 || g.Lat == 0 || g.Long == 0 {
				return c.String(400, "Bad Request")
			}

			var options []lib.Modifier = make([]lib.Modifier, 0)
			if china {
				options = append(options, lib.Options.WithRegion(lib.Options.China))
			}

			var wg sync.WaitGroup
			var applePoints []distance.Point
			var appleErr error
			var wiglePoints []distance.Point

			// Apple WLOC query
			wg.Add(1)
			go func() {
				defer wg.Done()
				applePoints, appleErr = lib.SearchProximity(g.Lat, g.Long, 20, options...)
			}()

			// WiGLE query (if credentials provided)
			if g.WiGLEApiName != "" && g.WiGLEApiToken != "" {
				wg.Add(1)
				go func() {
					defer wg.Done()
					wp, err := lib.SearchWiGLE(g.Lat, g.Long, g.WiGLEApiName, g.WiGLEApiToken)
					if err != nil {
						log.Println("WiGLE error:", err)
						return
					}
					wiglePoints = wp
				}()
			}

			wg.Wait()

			// Need at least one source to return results
			if appleErr != nil && len(wiglePoints) == 0 {
				log.Println(appleErr)
				return c.String(404, "did not find any points nearby")
			}

			var allPoints []distance.Point
			if appleErr == nil && len(applePoints) > 0 {
				allPoints = append(allPoints, applePoints...)
			}
			allPoints = append(allPoints, wiglePoints...)

			if len(allPoints) == 0 {
				return c.String(404, "did not find any points nearby")
			}

			return c.JSON(200, map[string]any{
				"closest": allPoints[0],
				"points":  allPoints[1:],
			})
		})
		e.POST("/wigle/search", func(c echo.Context) error {
			var req struct {
				Type          string `json:"type"`
				Query         string `json:"query"`
				WiGLEApiName  string `json:"wigle_api_name"`
				WiGLEApiToken string `json:"wigle_api_token"`
			}
			if err := c.Bind(&req); err != nil {
				return c.String(400, "Bad Request")
			}
			if req.Query == "" || req.WiGLEApiName == "" || req.WiGLEApiToken == "" {
				return c.String(400, "Query and WiGLE credentials are required")
			}

			var points []distance.Point
			var err error
			switch req.Type {
			case "ssid":
				points, err = lib.SearchWiGLEBySSID(req.Query, req.WiGLEApiName, req.WiGLEApiToken)
			case "bssid":
				points, err = lib.SearchWiGLEByBSSID(req.Query, req.WiGLEApiName, req.WiGLEApiToken)
			default:
				return c.String(400, "Type must be 'ssid' or 'bssid'")
			}

			if err != nil {
				log.Println("WiGLE search error:", err)
				return c.String(500, err.Error())
			}

			return c.JSON(200, map[string]any{
				"points": points,
			})
		})
		go openBrowser("http://127.0.0.1:1974")
		e.Logger.Fatal(e.Start("127.0.0.1:1974"))
		return nil
	})
	if err := cli.Run(); err != nil {
		panic(err)
	}
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		fmt.Println("Could not open browser:", err)
	}
}

func Render(ctx echo.Context, statusCode int, t templ.Component) error {
	ctx.Response().Header().Set(echo.HeaderContentType, echo.MIMETextHTML)
	ctx.Response().Writer.WriteHeader(statusCode)
	return t.Render(ctx.Request().Context(), ctx.Response().Writer)
}
