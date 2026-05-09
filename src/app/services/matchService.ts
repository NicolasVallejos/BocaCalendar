// API de SofaScore - https://www.sofascore.com/api/

export interface Match {
  id: string;
  date: string;
  time: string;
  opponent: string;
  competition: string;
  venue: string;
  homeAway: 'home' | 'away';
  status: 'upcoming' | 'finished';
  timestamp: number;
  result?: {
    bocaScore: number;
    opponentScore: number;
  };
}

const EXCLUDED_EVENT_STATUS_TYPES = new Set([
  'postponed',
  'suspended',
  'cancelled',
  'canceled',
  'interrupted',
  'abandoned',
  'awarded',
]);

// Boca Juniors ID en SofaScore: 3202
const BOCA_TEAM_ID = 3202;

// Caché de equipos
interface TeamInfo {
  id: number;
  name: string;
  logo?: string;
}

const SOFASCORE_TEAM_CACHE: Record<number, TeamInfo> = {};

export const getTeamLogo = (teamName: string): string => {
  for (const teamInfo of Object.values(SOFASCORE_TEAM_CACHE)) {
    if (teamInfo.name === teamName && teamInfo.logo) {
      return teamInfo.logo;
    }
  }
  return `https://via.placeholder.com/140x140/003399/ffcc66?text=${teamName.slice(0, 2).toUpperCase()}`;
};

export const fetchMatches = async (): Promise<Match[]> => {
  try {
    const [nextResponse, lastResponse] = await Promise.all([
      fetch('https://api.sofascore.com/api/v1/team/3202/events/next/0'),
      fetch('https://api.sofascore.com/api/v1/team/3202/events/last/0')
    ]);
    
    if (!nextResponse.ok || !lastResponse.ok) {
      throw new Error(`API error: ${nextResponse.status} / ${lastResponse.status}`);
    }
    
    const [nextData, lastData] = await Promise.all([
      nextResponse.json(),
      lastResponse.json()
    ]);
    
    let events = [...(nextData.events || nextData || []), ...(lastData.events || lastData || [])];
    
    if (!Array.isArray(events)) {
      throw new Error('Invalid response format');
    }
    
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-12-31');
    
    const filteredEvents = events.filter((event: any) => {
      const eventDate = event.startTimestamp ? new Date(event.startTimestamp * 1000) : null;
      if (!eventDate) return false;

      const eventStatusType = event.status?.type?.toLowerCase?.() || '';
      
      const isBoca = event.homeTeam?.id === BOCA_TEAM_ID || event.awayTeam?.id === BOCA_TEAM_ID;
      const isIn2026 = eventDate >= startDate && eventDate <= endDate;
      const isExcludedStatus = EXCLUDED_EVENT_STATUS_TYPES.has(eventStatusType);
      
      return isBoca && isIn2026 && !isExcludedStatus;
    });
    
    // Obtener IDs únicos de equipos
    const uniqueTeamIds = new Set<number>();
    filteredEvents.forEach((event: any) => {
      if (event.homeTeam?.id) uniqueTeamIds.add(event.homeTeam.id);
      if (event.awayTeam?.id) uniqueTeamIds.add(event.awayTeam.id);
    });
    
    // Hacer fetch de logos para equipos no cacheados
    const teamLogoPromises = Array.from(uniqueTeamIds).map(async (teamId) => {
      if (SOFASCORE_TEAM_CACHE[teamId]?.logo) {
        return; // Ya está en caché
      }
      
      try {
        const response = await fetch(`https://api.sofascore.com/api/v1/team/${teamId}/image`);
        const blob = await response.blob();
        const logoUrl = URL.createObjectURL(blob);
        
        // Actualizar caché con la URL del blob
        if (SOFASCORE_TEAM_CACHE[teamId]) {
          SOFASCORE_TEAM_CACHE[teamId].logo = logoUrl;
        } else {
          const teamEvent = filteredEvents.find((e: any) => e.homeTeam?.id === teamId || e.awayTeam?.id === teamId);
          const teamData = teamEvent?.homeTeam?.id === teamId ? teamEvent.homeTeam : teamEvent?.awayTeam;
          SOFASCORE_TEAM_CACHE[teamId] = {
            id: teamId,
            name: teamData?.name || `Team ${teamId}`,
            logo: logoUrl
          };
        }
      } catch (error) {
        console.error(`Error fetching logo for team ${teamId}:`, error);
        // Guardar sin logo si falla
        if (!SOFASCORE_TEAM_CACHE[teamId]) {
          const teamEvent = filteredEvents.find((e: any) => e.homeTeam?.id === teamId || e.awayTeam?.id === teamId);
          const teamData = teamEvent?.homeTeam?.id === teamId ? teamEvent.homeTeam : teamEvent?.awayTeam;
          SOFASCORE_TEAM_CACHE[teamId] = {
            id: teamId,
            name: teamData?.name || `Team ${teamId}`
          };
        }
      }
    });
    
    await Promise.all(teamLogoPromises);

    const getVenueName = async (event: any): Promise<string> => {
      const directVenue = event.venue?.stadium?.name || event.venue?.name;
      if (directVenue) {
        return directVenue;
      }

      try {
        const response = await fetch(`https://api.sofascore.com/api/v1/event/${event.id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch event detail: ${response.status}`);
        }

        const detailData = await response.json();
        const detailEvent = detailData.event || detailData;

        const detailVenue =
          detailEvent?.venue?.stadium?.name ||
          detailEvent?.venue?.name ||
          detailEvent?.homeTeam?.venue?.stadium?.name ||
          detailEvent?.homeTeam?.venue?.name ||
          detailEvent?.awayTeam?.venue?.stadium?.name ||
          detailEvent?.awayTeam?.venue?.name;

        if (detailVenue) {
          return detailVenue;
        }
      } catch (error) {
        console.error(`Error fetching venue for event ${event.id}:`, error);
      }

      return event.homeTeam?.venue?.stadium?.name ||
        event.homeTeam?.venue?.name ||
        event.awayTeam?.venue?.stadium?.name ||
        event.awayTeam?.venue?.name ||
        'Estadio no informado';
    };
    
    const matches = await Promise.all(
      filteredEvents
        .map(async (event: any): Promise<Match> => {
          const isBocaHome = event.homeTeam?.id === BOCA_TEAM_ID;
          const eventDate = new Date(event.startTimestamp * 1000);
          const dateStr = eventDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
          const timeStr = eventDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
          const isFinished = event.status === 'finished' || event.status?.type === 'finished';
          const venueName = isBocaHome ? 'La Bombonera' : await getVenueName(event);
          
          return {
            id: event.id?.toString() || Math.random().toString(),
            timestamp: event.startTimestamp ? event.startTimestamp * 1000 : Date.now(),
            date: dateStr,
            time: timeStr,
            opponent: isBocaHome ? event.awayTeam?.name : event.homeTeam?.name,
            competition: event.tournament?.name || event.league?.name || 'Competencia',
            venue: venueName,
            homeAway: isBocaHome ? 'home' : 'away',
            status: isFinished ? 'finished' : 'upcoming',
            result: isFinished && event.homeScore ? {
              bocaScore: isBocaHome ? event.homeScore.current : event.awayScore.current,
              opponentScore: isBocaHome ? event.awayScore.current : event.homeScore.current,
            } : undefined,
          };
        })
    );
      
      if (matches.length > 0) {
        return matches;
      }
      
      throw new Error('No matches found for 2026');
    
  } catch (error) {
    console.error('Error fetching matches:', error);
    throw error;
  }
};
