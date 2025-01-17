import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy } from 'lucide-react';

const LGATracker = () => {
  const [visitedLGAs, setVisitedLGAs] = useState(new Set());
  const [lgaData, setLGAData] = useState(null);
  const [stats, setStats] = useState({ total: 0, visited: 0 });

  useEffect(() => {
    // Load visited LGAs from localStorage
    const saved = localStorage.getItem('visitedLGAs');
    if (saved) {
      setVisitedLGAs(new Set(JSON.parse(saved)));
    }
  
    // Fetch LGA data from Overpass API
    const fetchLGAs = async () => {
      const query = `
        [out:json][timeout:25];
        area["ISO3166-1"="AU"][admin_level=2]->.australia;
        (
          rel(area.australia)["admin_level"="6"]["boundary"="administrative"];
        );
        out body;
        >;
        out skel qt;
      `;
  
      try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query
        });
        
        const data = await response.json();
        
        // Convert Overpass data to GeoJSON
        const features = data.elements
          .filter(e => e.type === 'relation')
          .map(relation => ({
            type: 'Feature',
            properties: {
              id: relation.id,
              name: relation.tags.name || 'Unknown LGA',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [] // We'll need to construct this from the ways
            }
          }));
  
        const geoJson = {
          type: 'FeatureCollection',
          features
        };
  
        setLGAData(geoJson);
        setStats(prev => ({ ...prev, total: features.length }));
      } catch (error) {
        console.error('Error fetching LGA data:', error);
      }
    };
  
    fetchLGAs();
  }, []);

  useEffect(() => {
    // Save to localStorage whenever visitedLGAs changes
    localStorage.setItem('visitedLGAs', JSON.stringify([...visitedLGAs]));
    setStats(prev => ({ ...prev, visited: visitedLGAs.size }));
  }, [visitedLGAs]);

  const handleLGAClick = (feature) => {
    const lgaId = feature.properties.id;
    const newVisited = new Set(visitedLGAs);
    
    if (newVisited.has(lgaId)) {
      newVisited.delete(lgaId);
    } else {
      newVisited.add(lgaId);
    }
    
    setVisitedLGAs(newVisited);
  };

  const getStyle = (feature) => {
    return {
      fillColor: visitedLGAs.has(feature.properties.id) ? '#22c55e' : '#cbd5e1',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            LGA Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={(stats.visited / stats.total) * 100} className="mb-2" />
          <p className="text-sm text-gray-600">
            Visited {stats.visited} of {stats.total} LGAs ({((stats.visited / stats.total) * 100).toFixed(1)}%)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Australian LGA Visit Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 rounded-lg overflow-hidden">
            {lgaData && (
              <MapContainer
                center={[-25.2744, 133.7751]}
                zoom={4}
                className="h-full w-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <GeoJSON
                  data={lgaData}
                  style={getStyle}
                  onEachFeature={(feature, layer) => {
                    layer.on({
                      click: () => handleLGAClick(feature)
                    });
                    layer.bindTooltip(feature.properties.name);
                  }}
                />
              </MapContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LGATracker;