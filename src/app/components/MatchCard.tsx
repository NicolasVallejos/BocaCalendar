import { Calendar, MapPin, Trophy, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getTeamLogo } from '@/app/services/matchService';

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

interface MatchCardProps {
  match: Match;
}

interface MatchStats {
  possession?: string;
  shots?: string;
  shotsOnTarget?: string;
  passes?: string;
  passAccuracy?: string;
}

interface MatchStatsComplete {
  home: MatchStats;
  away: MatchStats;
}

export function MatchCard({ match }: MatchCardProps) {
  const isPast = match.status === 'finished';
  const isHome = match.homeAway === 'home';
  const bocaLogo = getTeamLogo('Boca Juniors');
  const opponentLogo = getTeamLogo(match.opponent);
  
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState<MatchStatsComplete | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Fetch estadísticas cuando se intenta voltear
  useEffect(() => {
    if (isFlipped && isPast && !stats && !loadingStats) {
      fetchMatchStats();
    }
  }, [isFlipped]);

  const fetchMatchStats = async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      console.log('Fetching stats for match ID:', match.id);
      const response = await fetch(`https://api.sofascore.com/api/v1/event/${match.id}/statistics`);
      console.log('Response status:', response.status);
      
      if (!response.ok) throw new Error(`Failed to fetch stats: ${response.status}`);
      const data = await response.json();
      
      // data.statistics[0] contiene todos los datos del partido con groups
      if (data.statistics && Array.isArray(data.statistics) && data.statistics.length > 0) {
        const matchStats = data.statistics[0];
        
        // Buscar el grupo "Match overview" que contiene las estadísticas principales
        const matchOverviewGroup = matchStats.groups?.find((g: any) => g.groupName === 'Match overview');
        const shotsGroup = matchStats.groups?.find((g: any) => g.groupName === 'Shots');
        
        if (!matchOverviewGroup || !matchOverviewGroup.statisticsItems) {
          throw new Error('No statistics items found');
        }
        
        const allItems = [...(matchOverviewGroup.statisticsItems || []), ...(shotsGroup?.statisticsItems || [])];
        
        // Extraer estadísticas por key
        const processStats = (): { home: MatchStats; away: MatchStats } => {
          const result = {
            home: {} as MatchStats,
            away: {} as MatchStats,
          };
          
          allItems.forEach((item: any) => {
            const homeVal = item.homeValue?.toString() || item.home;
            const awayVal = item.awayValue?.toString() || item.away;
            
            switch (item.key) {
              case 'ballPossession':
                result.home.possession = homeVal;
                result.away.possession = awayVal;
                break;
              case 'totalShotsOnGoal':
                result.home.shots = homeVal;
                result.away.shots = awayVal;
                break;
              case 'shotsOnGoal':
                result.home.shotsOnTarget = homeVal;
                result.away.shotsOnTarget = awayVal;
                break;
              case 'passes':
                result.home.passes = homeVal;
                result.away.passes = awayVal;
                break;
              case 'passAccuracy':
              case 'passesAccurate':
                // Calcular porcentaje si es posible
                result.home.passAccuracy = homeVal;
                result.away.passAccuracy = awayVal;
                break;
            }
          });
          
          return result;
        };
        
        const stats = processStats();
        console.log('Processed stats:', stats);
        
        setStats(stats);
      } else {
        console.log('No statistics found in response');
        setStatsError('Estadísticas no disponibles');
      }
    } catch (error) {
      setStatsError('Error al cargar estadísticas');
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };


  return (
    <div
      onMouseEnter={() => isPast && setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      className="relative h-96 cursor-pointer perspective"
      style={{ perspective: '1000px' }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front of card */}
        <div
          className="absolute w-full h-full bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Competition Badge */}
          <div className="bg-gradient-to-r from-[#003d7d] to-[#0052a3] px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">{match.competition}</span>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              isPast ? 'bg-white/20 text-white' : 'bg-[#fedf00] text-[#003d7d]'
            }`}>
              {isPast ? 'Finalizado' : 'Próximo'}
            </span>
          </div>

          <div className="p-6">
            {/* Match Teams */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-6">
                {isHome ? (
                  <>
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-2 shadow-lg p-2">
                        <img src={bocaLogo} alt="Boca Juniors" className="w-full h-full object-contain" />
                      </div>
                      <span className="font-bold text-lg text-[#003d7d]">Boca</span>
                      {isPast && <span className="text-3xl font-bold text-[#003d7d] mt-2">{match.result?.bocaScore}</span>}
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-2xl font-light text-gray-300">VS</span>
                    </div>
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-2 shadow-md p-2">
                        <img src={opponentLogo} alt={match.opponent} className="w-full h-full object-contain" />
                      </div>
                      <span className="font-semibold text-lg text-gray-700 text-center">{match.opponent}</span>
                      {isPast && <span className="text-3xl font-bold text-gray-700 mt-2">{match.result?.opponentScore}</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-2 shadow-md p-2">
                        <img src={opponentLogo} alt={match.opponent} className="w-full h-full object-contain" />
                      </div>
                      <span className="font-semibold text-lg text-gray-700 text-center">{match.opponent}</span>
                      {isPast && <span className="text-3xl font-bold text-gray-700 mt-2">{match.result?.opponentScore}</span>}
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-2xl font-light text-gray-300">VS</span>
                    </div>
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-2 shadow-lg p-2">
                        <img src={bocaLogo} alt="Boca Juniors" className="w-full h-full object-contain" />
                      </div>
                      <span className="font-bold text-lg text-[#003d7d]">Boca</span>
                      {isPast && <span className="text-3xl font-bold text-[#003d7d] mt-2">{match.result?.bocaScore}</span>}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Date and Venue */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-8 h-8 rounded-lg bg-[#fedf00]/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[#003d7d]" />
                </div>
                <span className="text-sm font-medium">{match.date} • {match.time}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-8 h-8 rounded-lg bg-[#fedf00]/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[#003d7d]" />
                </div>
                <span className="text-sm font-medium">{match.venue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back of card - Statistics */}
        <div
          className="absolute w-full h-full bg-gradient-to-br from-[#003d7d] to-[#0052a3] rounded-2xl shadow-sm overflow-hidden border border-gray-100 p-6 flex flex-col justify-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {!isPast ? (
            <div className="text-center">
              <p className="text-white text-lg font-semibold">Estadísticas</p>
              <p className="text-[#fedf00] text-sm mt-4">No disponibles hasta<br />que el partido termine</p>
            </div>
          ) : loadingStats ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#fedf00] animate-spin" />
              <p className="text-white text-sm">Cargando estadísticas...</p>
            </div>
          ) : statsError ? (
            <div className="text-center">
              <p className="text-white text-sm font-semibold">Estadísticas</p>
              <p className="text-[#fedf00] text-xs mt-3">{statsError}</p>
            </div>
          ) : stats ? (
            <div className="space-y-3">
              <h3 className="text-white font-bold text-center text-sm mb-3">Estadísticas</h3>
              <div className="space-y-3 text-xs">
                {/* Posesión */}
                {(stats.home.possession || stats.away.possession) && (
                  <div>
                    <div className="flex justify-between text-white/80 mb-1 text-[10px]">
                      <span>{isHome ? 'BOCA' : match.opponent}</span>
                      <span>{isHome ? match.opponent : 'BOCA'}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-gradient-to-r from-[#fedf00] to-[#003d7d] transition-all"
                        style={{ width: `${parseInt(stats.home.possession || '0')}%` }}
                      />
                      <div 
                        className="bg-gradient-to-r from-[#003d7d] to-[#fedf00] transition-all"
                        style={{ width: `${parseInt(stats.away.possession || '0')}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-white mt-0.5">
                      <span className="text-[10px]">{stats.home.possession}</span>
                      <span className="text-[10px]">Posesión</span>
                      <span className="text-[10px]">{stats.away.possession}</span>
                    </div>
                  </div>
                )}

                {/* Tiros */}
                {(stats.home.shots || stats.away.shots) && (
                  <div>
                    <div className="flex justify-between text-white/80 mb-1 text-[10px]">
                      <span>{isHome ? 'BOCA' : match.opponent}</span>
                      <span>{isHome ? match.opponent : 'BOCA'}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                        style={{ width: `${(parseInt(stats.home.shots || '0') / (parseInt(stats.home.shots || '0') + parseInt(stats.away.shots || '0'))) * 100}%` }}
                      />
                      <div 
                        className="bg-gradient-to-r from-red-400 to-red-600 transition-all"
                        style={{ width: `${(parseInt(stats.away.shots || '0') / (parseInt(stats.home.shots || '0') + parseInt(stats.away.shots || '0'))) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-white mt-0.5">
                      <span className="text-[10px]">{stats.home.shots}</span>
                      <span className="text-[10px]">Tiros</span>
                      <span className="text-[10px]">{stats.away.shots}</span>
                    </div>
                  </div>
                )}

                {/* Tiros al arco */}
                {(stats.home.shotsOnTarget || stats.away.shotsOnTarget) && (
                  <div>
                    <div className="flex justify-between text-white/80 mb-1 text-[10px]">
                      <span>{isHome ? 'BOCA' : match.opponent}</span>
                      <span>{isHome ? match.opponent : 'BOCA'}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 transition-all"
                        style={{ width: `${(parseInt(stats.home.shotsOnTarget || '0') / (parseInt(stats.home.shotsOnTarget || '0') + parseInt(stats.away.shotsOnTarget || '0'))) * 100}%` }}
                      />
                      <div 
                        className="bg-gradient-to-r from-orange-400 to-orange-600 transition-all"
                        style={{ width: `${(parseInt(stats.away.shotsOnTarget || '0') / (parseInt(stats.home.shotsOnTarget || '0') + parseInt(stats.away.shotsOnTarget || '0'))) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-white mt-0.5">
                      <span className="text-[10px]">{stats.home.shotsOnTarget}</span>
                      <span className="text-[10px]">Al arco</span>
                      <span className="text-[10px]">{stats.away.shotsOnTarget}</span>
                    </div>
                  </div>
                )}

                {/* Pases */}
                {(stats.home.passes || stats.away.passes) && (
                  <div>
                    <div className="flex justify-between text-white/80 mb-1 text-[10px]">
                      <span>{isHome ? 'BOCA' : match.opponent}</span>
                      <span>{isHome ? match.opponent : 'BOCA'}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-gradient-to-r from-purple-400 to-purple-600 transition-all"
                        style={{ width: `${(parseInt(stats.home.passes || '0') / (parseInt(stats.home.passes || '0') + parseInt(stats.away.passes || '0'))) * 100}%` }}
                      />
                      <div 
                        className="bg-gradient-to-r from-pink-400 to-pink-600 transition-all"
                        style={{ width: `${(parseInt(stats.away.passes || '0') / (parseInt(stats.home.passes || '0') + parseInt(stats.away.passes || '0'))) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-white mt-0.5">
                      <span className="text-[10px]">{stats.home.passes}</span>
                      <span className="text-[10px]">Pases</span>
                      <span className="text-[10px]">{stats.away.passes}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}