import { useState, useEffect } from 'react';
import { MatchCard, Match } from '@/app/components/MatchCard';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';
import { fetchMatches, getTeamLogo } from '@/app/services/matchService';

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'finished'>('all');
  const [filterCompetition, setFilterCompetition] = useState<string>('all');

  // Cargar partidos dinámicamente
  useEffect(() => {
    const loadMatches = async () => {
      setLoading(true);
      try {
        const data = await fetchMatches();
        setMatches(data);
      } catch (error) {
        console.error('Error loading matches:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, []);

  // Obtener competiciones únicas
  const competitions = ['all', ...Array.from(new Set(matches.map(m => m.competition)))];

  // Filtrar partidos
  const competitionFiltered = matches.filter(match => {
    return filterCompetition === 'all' || match.competition === filterCompetition;
  });

  // Cuando 'Todos' está activo, mostrar primero finalizados (más recientes) y luego próximos (más cercanos).
  let displayedMatches: Match[];
  if (filterStatus === 'all') {
    const finished = competitionFiltered
      .filter(m => m.status === 'finished')
      .sort((a, b) => a.timestamp - b.timestamp);
    const upcoming = competitionFiltered
      .filter(m => m.status === 'upcoming')
      .sort((a, b) => a.timestamp - b.timestamp);
    displayedMatches = [...finished, ...upcoming];
  } else {
    displayedMatches = competitionFiltered.filter(match => match.status === filterStatus);
  }

  // Separar próximos y pasados (solo 2026)
  const allPastMatches2026 = matches.filter(m => m.status === 'finished' && new Date(m.timestamp).getFullYear() === 2026);
  const lastFivePastMatches = [...allPastMatches2026].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  const headingTitle = filterStatus === 'upcoming' ? 'Próximos Partidos' : filterStatus === 'finished' ? 'Partidos Finalizados' : 'Partidos';

  const scrollResults = (direction: 'left' | 'right') => {
    const container = document.getElementById('results-container');
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const bocaLogo = getTeamLogo('Boca Juniors');

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-[#003d7d] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-xl font-medium">Cargando partidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#003d7d] via-[#0052a3] to-[#003d7d]"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#fedf00] rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#fedf00] rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-2xl p-2">
                <img src={bocaLogo} alt="Boca Juniors" className="w-full h-full object-contain" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-white mb-3">
              Calendario Boca Juniors
            </h1>
            <p className="text-xl text-[#fedf00]/90">
              Fixture y resultados del Xeneize
            </p>
          </div>
        </div>
      </div>

      {/* Results Bar - Solo partidos 2026 */}
      {lastFivePastMatches.length > 0 && (
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-[#003d7d] rounded-full"></div>
              Últimos Resultados 2026
            </h3>
            <div className="relative">
              <button
                onClick={() => scrollResults('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white text-[#003d7d] p-3 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 border border-gray-200"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollResults('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white text-[#003d7d] p-3 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 border border-gray-200"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div
                id="results-container"
                className="flex gap-4 overflow-x-auto scrollbar-hide px-12 py-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {lastFivePastMatches.map(match => {
                  const isWin = match.result && match.result.bocaScore > match.result.opponentScore;
                  const isDraw = match.result && match.result.bocaScore === match.result.opponentScore;
                  const isLoss = match.result && match.result.bocaScore < match.result.opponentScore;
                  const opponentLogo = getTeamLogo(match.opponent);
                  
                  return (
                    <div
                      key={match.id}
                      className="flex-shrink-0 bg-gradient-to-br from-white to-gray-50 rounded-2xl p-5 border border-gray-200 min-w-[300px] hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-gray-500 font-medium">{match.date}</div>
                        <div className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded-full">{match.competition}</div>
                      </div>
                      <div className="flex items-center justify-between gap-4 mb-3">
                        {match.homeAway === 'home' ? (
                          <>
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md p-1">
                                <img src={bocaLogo} alt="Boca Juniors" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-[#003d7d] font-bold text-sm">BOCA</span>
                              <span className="text-3xl font-bold text-[#003d7d]">{match.result?.bocaScore}</span>
                            </div>
                            <span className="text-gray-300 font-bold">-</span>
                            <div className="flex items-center gap-3 flex-1 justify-end">
                              <span className="text-3xl font-bold text-gray-600">{match.result?.opponentScore}</span>
                              <span className="text-gray-700 font-semibold text-xs text-right max-w-[60px] truncate">{match.opponent}</span>
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md p-1">
                                <img src={opponentLogo} alt={match.opponent} className="w-full h-full object-contain" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md p-1">
                                <img src={opponentLogo} alt={match.opponent} className="w-full h-full object-contain" />
                              </div>
                              <span className="text-gray-700 font-semibold text-xs max-w-[60px] truncate">{match.opponent}</span>
                              <span className="text-3xl font-bold text-gray-600">{match.result?.opponentScore}</span>
                            </div>
                            <span className="text-gray-300 font-bold">-</span>
                            <div className="flex items-center gap-3 flex-1 justify-end">
                              <span className="text-3xl font-bold text-[#003d7d]">{match.result?.bocaScore}</span>
                              <span className="text-[#003d7d] font-bold text-sm">BOCA</span>
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md p-1">
                                <img src={bocaLogo} alt="Boca Juniors" className="w-full h-full object-contain" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex justify-center">
                        {isWin && (
                          <span className="text-xs bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-1.5 rounded-full font-medium shadow-sm">✓ Victoria</span>
                        )}
                        {isDraw && (
                          <span className="text-xs bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-1.5 rounded-full font-medium shadow-sm">= Empate</span>
                        )}
                        {isLoss && (
                          <span className="text-xs bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-1.5 rounded-full font-medium shadow-sm">✗ Derrota</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-200">
          
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  filterStatus === 'all'
                    ? 'bg-gradient-to-r from-[#003d7d] to-[#0052a3] text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('upcoming')}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  filterStatus === 'upcoming'
                    ? 'bg-gradient-to-r from-[#003d7d] to-[#0052a3] text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Próximos
              </button>
              <button
                onClick={() => setFilterStatus('finished')}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  filterStatus === 'finished'
                    ? 'bg-gradient-to-r from-[#003d7d] to-[#0052a3] text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Finalizados
              </button>
            </div>
            <select
              value={filterCompetition}
              onChange={(e) => setFilterCompetition(e.target.value)}
              className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 border-none outline-none cursor-pointer font-medium hover:bg-gray-200 transition-colors"
            >
              {competitions.map(comp => (
                <option key={comp} value={comp}>
                  {comp === 'all' ? 'Todas las competiciones' : comp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Matches Grid - controla lo que se muestra según el nav */}
        {displayedMatches.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <div className="w-1.5 h-8 bg-gradient-to-b from-[#003d7d] to-[#fedf00] rounded-full"></div>
              {headingTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600 text-xl font-medium">
              No hay partidos disponibles
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-[#003d7d] to-[#0052a3] mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-[#fedf00] text-lg font-medium">💙 Vamos Boca 💛</p>
            <p className="text-white/60 text-sm mt-2">Fixture 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}