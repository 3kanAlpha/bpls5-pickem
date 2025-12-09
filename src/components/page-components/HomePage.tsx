"use client";

import { Button } from "@heroui/react";
import html2canvas from "html2canvas";
import { Download, GripVertical, Table, X } from "lucide-react";
import { useRef, useState } from "react";

// --- Data Definitions ---

const GAMES = ["beatmania IIDX", "SOUND VOLTEX", "DanceDanceRevolution"];

const TEAMS = [
  {
    id: "apina",
    name: "APINA VRAMeS",
    color: "#0057b5",
    logo: "/images/logo/apina_vrames.png",
    textColor: "white",
  },
  {
    id: "gigo",
    name: "GiGO",
    color: "#006cdc",
    logo: "/images/logo/gigo.png",
    textColor: "white",
  },
  {
    id: "gamepanic",
    name: "GAME PANIC",
    color: "#ffcb21",
    logo: "/images/logo/game_panic.png",
    textColor: "black",
  },
  {
    id: "silkhat",
    name: "SILK HAT",
    color: "#c8c8c8",
    logo: "/images/logo/silk_hat.png",
    textColor: "black",
  },
  {
    id: "tradz",
    name: "TAITO STATION Tradz",
    color: "#f00",
    logo: "/images/logo/tradz.png",
    textColor: "white",
  },
  {
    id: "round1",
    name: "ROUND1",
    color: "#d80c18",
    logo: "/images/logo/round1.png",
    textColor: "white",
  },
  {
    id: "leisureland",
    name: "レジャーランド",
    color: "#ff1d84",
    logo: "/images/logo/leisureland.png",
    textColor: "white",
  },
];

type PredictionState = {
  [key: string]: (string | null)[];
};

type SelectionState = {
  type: "pool" | "rank";
  id?: string;
  index?: number;
} | null;

type Action =
  | { type: "PLACE_FROM_POOL"; teamId: string; targetIndex: number }
  | { type: "MOVE_RANK_TO_RANK"; fromIndex: number; targetIndex: number }
  | { type: "REMOVE_FROM_RANK"; fromIndex: number };

export default function HomePage() {
  const [activeGame, setActiveGame] = useState(GAMES[0]);

  // State structure: { [gameName]: (TeamID | null)[] }
  // Initial state: Array of 7 nulls (empty slots)
  const [predictions, setPredictions] = useState<PredictionState>(() => {
    const initial: PredictionState = {};
    GAMES.forEach((game) => {
      initial[game] = Array(7).fill(null);
    });
    return initial;
  });

  // Selection state: { type: 'pool' | 'rank', id?: string, index?: number }
  const [selection, setSelection] = useState<SelectionState>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);

  const captureRef = useRef<HTMLDivElement>(null);

  // --- Logic Helpers ---

  const getTeamById = (id: string) => TEAMS.find((t) => t.id === id);

  const getRankedTeams = (game: string) => {
    return predictions[game].map((id) => (id ? getTeamById(id) : null));
  };

  const getUnrankedTeams = (game: string) => {
    const rankedIds = predictions[game].filter((id) => id !== null);
    return TEAMS.filter((t) => !rankedIds.includes(t.id));
  };

  // Main update logic
  const updatePrediction = (action: Action) => {
    const newSlots = [...predictions[activeGame]];

    if (action.type === "PLACE_FROM_POOL") {
      // Pool -> Rank (if occupied, overwrite/swap out to pool)
      newSlots[action.targetIndex] = action.teamId;
    } else if (action.type === "MOVE_RANK_TO_RANK") {
      // Rank -> Rank (Swap)
      const temp = newSlots[action.targetIndex];
      newSlots[action.targetIndex] = newSlots[action.fromIndex];
      newSlots[action.fromIndex] = temp;
    } else if (action.type === "REMOVE_FROM_RANK") {
      // Rank -> Pool
      newSlots[action.fromIndex] = null;
    }

    setPredictions((prev) => ({
      ...prev,
      [activeGame]: newSlots,
    }));
    setSelection(null);
  };

  // --- Event Handlers ---

  // Drag Start
  const handleDragStart = (e: React.DragEvent, source: any) => {
    // source: { type: 'pool' | 'rank', id?: string, index?: number }
    e.dataTransfer.setData("application/json", JSON.stringify(source));
    e.dataTransfer.effectAllowed = "move";
    setSelection(source); // Also set selection for visual feedback
  };

  // Drag Over / Drop on Rank Slot
  const handleRankDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));

      if (data.type === "pool") {
        updatePrediction({
          type: "PLACE_FROM_POOL",
          teamId: data.id,
          targetIndex,
        });
      } else if (data.type === "rank" && typeof data.index === "number") {
        if (data.index !== targetIndex) {
          updatePrediction({
            type: "MOVE_RANK_TO_RANK",
            fromIndex: data.index,
            targetIndex,
          });
        }
      }
    } catch (err) {
      console.error("Drop error", err);
    }
  };

  // Drop on Pool (Remove from rank)
  const handlePoolDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data.type === "rank" && typeof data.index === "number") {
        updatePrediction({ type: "REMOVE_FROM_RANK", fromIndex: data.index });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Click / Tap Logic
  const handlePoolClick = (teamId: string) => {
    if (
      selection &&
      selection.type === "rank" &&
      typeof selection.index === "number"
    ) {
      // If a rank slot is selected, clicking pool removes it from rank
      updatePrediction({
        type: "REMOVE_FROM_RANK",
        fromIndex: selection.index,
      });
    } else if (
      selection &&
      selection.type === "pool" &&
      selection.id === teamId
    ) {
      // Deselect
      setSelection(null);
    } else {
      // Select new pool item
      setSelection({ type: "pool", id: teamId });
    }
  };

  const handleRankClick = (index: number) => {
    const currentSlot = predictions[activeGame][index];

    if (selection) {
      if (selection.type === "pool" && typeof selection.id === "string") {
        // Place pool item into this slot
        updatePrediction({
          type: "PLACE_FROM_POOL",
          teamId: selection.id,
          targetIndex: index,
        });
      } else if (
        selection.type === "rank" &&
        typeof selection.index === "number"
      ) {
        if (selection.index === index) {
          // Deselect if same
          setSelection(null);
        } else {
          // Swap rank items
          updatePrediction({
            type: "MOVE_RANK_TO_RANK",
            fromIndex: selection.index,
            targetIndex: index,
          });
        }
      }
    } else {
      // Nothing selected yet
      if (currentSlot) {
        // Select this rank slot
        setSelection({ type: "rank", index, id: currentSlot });
      }
    }
  };

  // TODO: fix screen capture
  const handleExport = async () => {
    if (!captureRef.current) return;
    setIsExporting(true);
    setSelection(null); // Clear selection visuals

    setTimeout(async () => {
      try {
        const element = captureRef.current;
        if (!element) throw new Error("Capture element not found");

        const canvas = await html2canvas(element, {
          backgroundColor: "#0f172a",
          scale: 2,
          useCORS: true,
        });

        const link = document.createElement("a");
        link.download = `BPL_S5_PickEms_${activeGame.replace(/\s/g, "_")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (err) {
        console.error("Export failed:", err);
        alert("画像の保存に失敗しました。");
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  const rankedTeams = getRankedTeams(activeGame);
  const unrankedTeams = getUnrankedTeams(activeGame);

  return (
    <div className="min-h-screen pb-12 px-2 md:px-0">
      {/* Header */}
      <header className="max-w-3xl mx-auto py-6 text-center">
        <div className="text-left w-fit mx-auto">
          <h2 className="text-xl md:text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
            BPL -SEASON 5-
          </h2>
          <h1 className="text-3xl md:text-6xl font-black text-white mb-4">
            Pick'Ems
          </h1>
          <p className="text-xl font-bold mb-4 w-fit mx-auto">
            - Regular Stage -
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-4">
          <Button onPress={() => setShowTableModal(true)} variant="tertiary">
            <Table size={14} />
            対戦表を確認する
          </Button>
        </div>

        {/* Game Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {GAMES.map((game) => (
            <button
              key={game}
              onClick={() => {
                setActiveGame(game);
                setSelection(null);
              }}
              className={`px-4 py-2 rounded-lg font-bold transition-all transform text-sm md:text-base ${
                activeGame === game
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg scale-105"
                  : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
              }`}
              type="button"
            >
              {game}
            </button>
          ))}
        </div>
      </header>

      {/* TEAM POOL (HAND) */}
      <div
        className={`max-w-2xl mx-auto mb-6 p-4 rounded-xl border-2 transition-colors min-h-[120px] pool-area ${
          selection?.type === "rank"
            ? "border-red-500/50 bg-red-500/10"
            : "border-zinc-700 bg-zinc-800/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (selection?.type === "rank")
            e.currentTarget.classList.add("drag-over");
        }}
        onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
        onDrop={handlePoolDrop}
        onClick={() => {
          // If rank selected, clicking background of pool removes it
          if (selection?.type === "rank" && typeof selection.index === "number")
            updatePrediction({
              type: "REMOVE_FROM_RANK",
              fromIndex: selection.index,
            });
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
            {selection?.type === "rank"
              ? "ここへドロップしてリストに戻す"
              : "Unranked Teams (Tap or Drag to Rank)"}
          </h3>
          <span className="text-xs bg-zinc-700 px-2 py-1 rounded text-zinc-300">
            {unrankedTeams.length} Left
          </span>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3">
          {unrankedTeams.map((team) => (
            <div
              key={team.id}
              draggable
              onDragStart={(e) =>
                handleDragStart(e, { type: "pool", id: team.id })
              }
              onClick={(e) => {
                e.stopPropagation();
                handlePoolClick(team.id);
              }}
              className={`
                                    w-14 h-14 md:w-16 md:h-16 rounded-lg cursor-pointer team-card-shadow overflow-hidden relative transition-transform
                                    ${selection?.type === "pool" && selection.id === team.id ? "selected-team scale-110" : "hover:scale-105"}
                                `}
              style={{ backgroundColor: team.color }}
            >
              <img
                src={team.logo}
                alt={team.name}
                className="w-full h-full object-contain p-1"
              />
            </div>
          ))}
          {unrankedTeams.length === 0 && (
            <div className="text-zinc-500 text-sm py-4 italic w-full text-center">
              すべてのチームが配置されました
            </div>
          )}
        </div>
      </div>

      {/* RANKING BOARD (Capture Target) */}
      <div
        ref={captureRef}
        id="capture-area"
        className="max-w-2xl mx-auto bg-zinc-900 p-4 md:p-8 rounded-2xl border border-zinc-800 shadow-2xl relative"
      >
        {/* Header inside capture */}
        <div className="flex justify-between items-end mb-6 border-b border-zinc-700 pb-4">
          <div>
            <h3 className="text-2xl font-bold text-white">{activeGame}</h3>
            <p className="text-zinc-400 text-sm">自分のピック</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-500 block">
              BEMANI PRO LEAGUE -SEASON 5-
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {rankedTeams.map((team, index) => (
            <div key={index}>
              {/* Semifinal Cutoff Line */}
              {index === 4 && (
                <div className="py-4 flex items-center gap-4">
                  <div className="h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent flex-1 opacity-50"></div>
                  <span className="text-yellow-400 text-[10px] md:text-xs font-bold uppercase tracking-wider glow-text whitespace-nowrap">
                    ▲ 4位以上でセミファイナル進出
                  </span>
                  <div className="h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent flex-1 opacity-50"></div>
                </div>
              )}

              {/* Rank Slot */}
              <div
                className="flex items-center gap-3 md:gap-4 group"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("drag-over");
                }}
                onDragLeave={(e) =>
                  e.currentTarget.classList.remove("drag-over")
                }
                onDrop={(e) => handleRankDrop(e, index)}
                onClick={() => handleRankClick(index)}
              >
                {/* Rank Number */}
                <div
                  className={`
                                w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center rounded-lg font-black text-xl md:text-2xl transition-colors
                                ${index < 4 ? "bg-zinc-800 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.2)]" : "bg-zinc-800/50 text-zinc-600"}
                                ${selection?.type === "pool" ? "bg-blue-900/30 text-blue-300 border-2 border-blue-500/30" : ""}
                            `}
                >
                  {index + 1}
                </div>

                {/* Slot Content */}
                <div
                  className={`
                                flex-1 relative h-16 md:h-20 rounded-xl transition-all duration-200 
                                flex items-center
                                ${team ? "team-card-shadow pr-4 border-l-4" : "border-2 border-dashed border-slate-700 empty-slot-pattern hover:border-slate-500"}
                                ${selection?.type === "rank" && selection.index === index ? "selected-team scale-[1.02] z-10" : ""}
                                ${selection?.type === "pool" && !team ? "animate-pulse border-blue-400/50 bg-blue-900/10" : ""}
                            `}
                  style={
                    team
                      ? {
                          backgroundColor: team.color,
                          borderColor:
                            team.textColor === "white"
                              ? "rgba(255,255,255,0.3)"
                              : "rgba(0,0,0,0.3)",
                          cursor: "grab",
                        }
                      : { cursor: "pointer" }
                  }
                  draggable={!!team && !isExporting}
                  onDragStart={(e) =>
                    team &&
                    handleDragStart(e, { type: "rank", index, id: team.id })
                  }
                >
                  {team ? (
                    <>
                      {/* Filled Slot */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none"></div>

                      <div className="h-full w-24 md:w-32 flex-shrink-0 bg-white/10 backdrop-blur-sm flex items-center justify-center p-2 mr-4">
                        <img
                          src={team.logo}
                          alt={team.name}
                          className="max-h-full max-w-full object-contain filter drop-shadow-md"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>

                      <div
                        className="font-black text-lg md:text-2xl tracking-tight truncate z-10"
                        style={{ color: team.textColor }}
                      >
                        {team.name}
                      </div>

                      {!isExporting && (
                        <div className="ml-auto opacity-0 group-hover:opacity-50 transition-opacity">
                          <GripVertical
                            size={20}
                            className={
                              team.textColor === "white"
                                ? "text-white"
                                : "text-black"
                            }
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    /* Empty Slot */
                    <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold tracking-widest uppercase text-sm">
                      {selection?.type === "pool" ? "Place Here" : "Empty Slot"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer in Capture */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex justify-between items-center opacity-50 text-xs">
          <p>BEMANI PRO LEAGUE -SEASON 5- Pick'Ems</p>
          <p>#BPLS5</p>
        </div>
      </div>

      {/* Actions */}
      <div className="max-w-2xl mx-auto mt-6 flex flex-col items-center gap-4">
        <div className="text-slate-500 text-sm text-center">
          {selection
            ? selection.type === "pool"
              ? "配置する順位をタップしてください"
              : "移動先の順位をタップ、または上のリストに戻して解除"
            : "チームをドラッグまたはタップして順位を予想"}
        </div>

        <Button isDisabled variant="primary" size="lg">
          <Download size={14} />
          画像を保存（工事中）
        </Button>
      </div>

      {/* Match Table Modal */}
      {showTableModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowTableModal(false)}
        >
          <div className="relative max-w-5xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 p-2">
            <button
              onClick={() => setShowTableModal(false)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full z-10"
            >
              <X />
            </button>
            <img
              src="/images/match_table.jpg"
              alt="Match Table"
              className="w-full h-auto rounded-lg"
            />
            <div className="p-4 text-center">
              <p className="text-slate-400 text-sm">タップ/クリックで閉じる</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
