"use client";

import { Lexend_Deca, Open_Sans } from "next/font/google";
import React, { useState, useLayoutEffect, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardTopBar from "@/components/layout/DashboardTopBar";
import { useAuth } from "@/utils/AuthContext";
import {
  fetchUserSeatingChart,
  saveUserSeatingChart,
} from "@/lib/seating-chart/firestore";
import styles from "./seating-chart.module.css";

/** Gynzy-style typography for this page only (does not change global layout fonts). */
const seatingOpenSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-seating-open",
  display: "swap",
});

const seatingLexendDeca = Lexend_Deca({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-seating-lexend",
  display: "swap",
});

// Furniture type definitions: { id, seats, w, h, color?, paletteImage?, pieceLabel?, labelColor? }
// Optional paletteImage: path under /public for custom thumbnails.
/** On-canvas desk height — shared so one double matches two singles side by side. */
const DESK_CANVAS_H = 112;
/** Single desk width; double is exactly 2× this (plus tiny seam in the PNG). */
const DESK_CANVAS_W = 128;
const DOUBLE_DESK_CANVAS_W = DESK_CANVAS_W * 2;
/** Bump when desk PNGs change so browsers don’t keep stale cached art. */
const DESK_ART_VERSION = "v2";

const FURNITURE_TYPES = [
  {
    id: "desk",
    seats: 1,
    w: DESK_CANVAS_W,
    h: DESK_CANVAS_H,
    color: "#8d6e63",
    paletteImage: `/seating-furniture/single-desk.png?${DESK_ART_VERSION}`,
  },
  {
    id: "double-desk",
    seats: 2,
    w: DOUBLE_DESK_CANVAS_W,
    h: DESK_CANVAS_H,
    color: "#8d6e63",
    paletteImage: `/seating-furniture/double-desk.png?${DESK_ART_VERSION}`,
  },
  { id: "promethean", seats: 0, w: 180, h: 55, color: "#1e293b" },
];

/** Keep placed desks on the current type size (localStorage may have old w/h). */
function withCurrentFurnitureSize(f) {
  const def = FURNITURE_TYPES.find((t) => t.id === f.type);
  if (!def) return f;
  if (f.w === def.w && f.h === def.h) return f;
  return { ...f, w: def.w, h: def.h };
}

const STUDENT_COLORS = ["#ef4444", "#f97316", "#22c55e", "#3b82f6", "#a855f7"];

let furnitureIdCounter = 1;
let studentIdCounter = 1;
let restrictionIdCounter = 1;

const RESTRICTION_TYPES = [
  { id: "cannot_sit_together", label: "Cannot sit together" },
  { id: "must_sit_near_front", label: "Must sit near front" },
];

/** First word only — short desk labels after shuffle / on furniture art. */
function deskLabelFromStudentName(name) {
  if (!name || typeof name !== "string") return "";
  const t = name.trim();
  if (!t) return "";
  return t.split(/\s+/)[0];
}

const DESK_LABEL_TEXT_SHADOW = "0 0 4px #000, 0 1px 3px rgba(0,0,0,0.85)";
/** Name sits on brown tabletop — below beige seat strip in desk PNGs. */
const DESK_LABEL_BAND_SINGLE = { top: "34%", height: "58%" };
/** Each half of a double desk: own horizontal slice so names align to that desk only. */
const DESK_LABEL_BAND_DOUBLE_HALF = { top: "38%", height: "54%" };
const DESK_LABEL_FONT_PX = 16;

/** When false, furniture always lands exactly under the pointer (no edge magnetism). */
const ENABLE_FURNITURE_SNAP = false;
/** Pixels (canvas space); only used if ENABLE_FURNITURE_SNAP is true */
const SNAP_THRESHOLD = 24;

function getSnappedPosition(dropX, dropY, movingW, movingH, otherFurniture, excludeId) {
  if (!ENABLE_FURNITURE_SNAP) return { x: dropX, y: dropY };

  const others = otherFurniture.filter((f) => f.id !== excludeId);
  if (others.length === 0) return { x: dropX, y: dropY };

  let bestX = dropX;
  let bestY = dropY;
  let bestDist = Infinity;

  const trySnap = (snapX, snapY) => {
    const dist = Math.hypot(snapX - dropX, snapY - dropY);
    if (dist <= SNAP_THRESHOLD && dist < bestDist) {
      bestDist = dist;
      bestX = snapX;
      bestY = snapY;
    }
  };

  others.forEach((other) => {
    const ox = other.x;
    const oy = other.y;
    const ow = other.w;
    const oh = other.h;
    // Edge-to-edge: moving right to other left, moving left to other right, etc.
    const snapRightToLeft = ox - ow / 2 - movingW / 2;
    const snapLeftToRight = ox + ow / 2 + movingW / 2;
    const snapBottomToTop = oy - oh / 2 - movingH / 2;
    const snapTopToBottom = oy + oh / 2 + movingH / 2;
    const snapLeftToLeft = ox - ow / 2 + movingW / 2;
    const snapRightToRight = ox + ow / 2 - movingW / 2;
    const snapTopToTop = oy - oh / 2 + movingH / 2;
    const snapBottomToBottom = oy + oh / 2 - movingH / 2;

    trySnap(snapRightToLeft, dropY);
    trySnap(snapLeftToRight, dropY);
    trySnap(snapLeftToLeft, dropY);
    trySnap(snapRightToRight, dropY);
    trySnap(dropX, snapBottomToTop);
    trySnap(dropX, snapTopToBottom);
    trySnap(dropX, snapTopToTop);
    trySnap(dropX, snapBottomToBottom);
    // Corner-style: snap both axes
    trySnap(snapRightToLeft, snapBottomToTop);
    trySnap(snapRightToLeft, snapTopToBottom);
    trySnap(snapLeftToRight, snapBottomToTop);
    trySnap(snapLeftToRight, snapTopToBottom);
    trySnap(snapLeftToLeft, snapBottomToTop);
    trySnap(snapLeftToLeft, snapTopToBottom);
    trySnap(snapRightToRight, snapBottomToTop);
    trySnap(snapRightToRight, snapTopToBottom);
  });

  return { x: bestX, y: bestY };
}

const STORAGE_KEY = "seating-chart-backup";

export default function SeatingChart() {
  useLayoutEffect(() => {
    document.title = "Code4Community | Seating Chart";
  }, []);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [chartName, setChartName] = useState("");
  const [activeTab, setActiveTab] = useState("furniture");
  const [students, setStudents] = useState([]);
  const [furnitureOnCanvas, setFurnitureOnCanvas] = useState([]);
  const [restrictions, setRestrictions] = useState([]);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showManageStudents, setShowManageStudents] = useState(false);
  const [manageStudentsText, setManageStudentsText] = useState("");
  const [sheetAnimated, setSheetAnimated] = useState(false);
  const [showManageRestrictions, setShowManageRestrictions] = useState(false);
  const [restrictionsSheetAnimated, setRestrictionsSheetAnimated] = useState(false);

  const applyChartData = useCallback((data) => {
    if (!data || typeof data !== "object") return;
    if (data.chartName != null) setChartName(String(data.chartName));
    if (Array.isArray(data.students)) setStudents(data.students.length > 0 ? data.students : []);
    if (Array.isArray(data.furniture)) {
      setFurnitureOnCanvas(data.furniture.map(withCurrentFurnitureSize));
    }
    if (Array.isArray(data.restrictions)) setRestrictions(data.restrictions);
    const fNums = (data.furniture || [])
      .map((f) => parseInt(String(f.id).replace(/^f-/, ""), 10))
      .filter((n) => !Number.isNaN(n));
    const sNums = (data.students || [])
      .map((s) => parseInt(String(s.id).replace(/^s-/, ""), 10))
      .filter((n) => !Number.isNaN(n));
    const rNums = (data.restrictions || [])
      .map((r) => parseInt(String(r.id).replace(/^r-/, ""), 10))
      .filter((n) => !Number.isNaN(n));
    if (fNums.length > 0) furnitureIdCounter = Math.max(...fNums, furnitureIdCounter) + 1;
    if (sNums.length > 0) studentIdCounter = Math.max(...sNums, studentIdCounter) + 1;
    if (rNums.length > 0) restrictionIdCounter = Math.max(...rNums, restrictionIdCounter) + 1;
  }, []);

  useEffect(() => {
    setHasLoadedFromStorage(false);
  }, [user?.uid]);

  useEffect(() => {
    if (hasLoadedFromStorage || authLoading) return;
    let cancelled = false;

    (async () => {
      try {
        if (user?.uid) {
          const cloud = await fetchUserSeatingChart(user.uid);
          if (cancelled) return;
          if (cloud) {
            applyChartData(cloud);
            try {
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ ...cloud, savedAt: cloud.savedAt || new Date().toISOString() }),
              );
            } catch (_) {}
            setHasLoadedFromStorage(true);
            return;
          }
        }

        const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (raw) {
          const data = JSON.parse(raw);
          if (!cancelled) applyChartData(data);
        }
      } catch (_) {
      } finally {
        if (!cancelled) setHasLoadedFromStorage(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasLoadedFromStorage, authLoading, user?.uid, applyChartData]);

  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    setFurnitureOnCanvas((prev) => {
      let changed = false;
      const next = prev.map((f) => {
        const n = withCurrentFurnitureSize(f);
        if (n !== f && (n.w !== f.w || n.h !== f.h)) changed = true;
        return n;
      });
      return changed ? next : prev;
    });
  }, [hasLoadedFromStorage]);

  const [newRestrictionType, setNewRestrictionType] = useState("cannot_sit_together");
  const [newRestrictionStudent1, setNewRestrictionStudent1] = useState("");
  const [newRestrictionStudent2, setNewRestrictionStudent2] = useState("");
  const canvasRef = useRef(null);
  const canvasScrollRef = useRef(null);
  /** Furniture `left`/`top` are relative to this node (`.canvasStage`), which is `margin: 0 auto` inside the wider scroll layer — not the scroll layer origin. */
  const canvasStageRef = useRef(null);
  const sidePanelScrollRef = useRef(null);
  const [sidePanelScroll, setSidePanelScroll] = useState({ showUp: false, showDown: false });
  const [dragState, setDragState] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(null);
  const dragImageRef = useRef(null);
  const layoutPastRef = useRef([]);
  const layoutFutureRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const CANVAS_WIDTH = 800;
  const LAYOUT_HISTORY_MAX = 50;

  const pushLayoutHistory = useCallback(() => {
    layoutPastRef.current.push(JSON.parse(JSON.stringify(furnitureOnCanvas)));
    if (layoutPastRef.current.length > LAYOUT_HISTORY_MAX) layoutPastRef.current.shift();
    layoutFutureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [furnitureOnCanvas]);

  const undoLayout = useCallback(() => {
    if (layoutPastRef.current.length === 0) return;
    const prev = layoutPastRef.current.pop();
    layoutFutureRef.current.push(JSON.parse(JSON.stringify(furnitureOnCanvas)));
    setFurnitureOnCanvas(prev);
    setSelectedFurnitureId(null);
    setCanUndo(layoutPastRef.current.length > 0);
    setCanRedo(true);
  }, [furnitureOnCanvas]);

  const redoLayout = useCallback(() => {
    if (layoutFutureRef.current.length === 0) return;
    const next = layoutFutureRef.current.pop();
    layoutPastRef.current.push(JSON.parse(JSON.stringify(furnitureOnCanvas)));
    setFurnitureOnCanvas(next);
    setSelectedFurnitureId(null);
    setCanUndo(true);
    setCanRedo(layoutFutureRef.current.length > 0);
  }, [furnitureOnCanvas]);

  const CANVAS_HEIGHT = 600;
  const CONTROL_BUTTON_OFFSET = 36;
  const CONTROL_LINE_LENGTH = 24;

  const syncSidePanelScroll = useCallback(() => {
    const el = sidePanelScrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setSidePanelScroll({
      showUp: scrollTop > 4,
      showDown: scrollTop + clientHeight < scrollHeight - 4,
    });
  }, []);

  useEffect(() => {
    const el = sidePanelScrollRef.current;
    if (!el) return undefined;
    const onScroll = () => syncSidePanelScroll();
    syncSidePanelScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => syncSidePanelScroll());
    ro.observe(el);
    const onWin = () => syncSidePanelScroll();
    window.addEventListener("resize", onWin);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("resize", onWin);
    };
  }, [activeTab, students.length, syncSidePanelScroll]);

  useLayoutEffect(() => {
    requestAnimationFrame(() => syncSidePanelScroll());
  }, [activeTab, students.length, syncSidePanelScroll]);

  const scrollSidePanelBy = (delta) => {
    const el = sidePanelScrollRef.current;
    if (!el) return;
    el.scrollBy({ top: delta, behavior: "smooth" });
  };

  const getAssignments = useCallback(() => {
    const map = {};
    furnitureOnCanvas.forEach((f) => {
      (f.assignedStudentIds || []).forEach((sid) => {
        map[sid] = f.id;
      });
    });
    return map;
  }, [furnitureOnCanvas]);

  const assignStudentToFurniture = useCallback((studentId, furnitureId) => {
    setFurnitureOnCanvas((prev) =>
      prev.map((f) => {
        if (f.id !== furnitureId) {
          return { ...f, assignedStudentIds: (f.assignedStudentIds || []).filter((id) => id !== studentId) };
        }
        const current = f.assignedStudentIds || [];
        if (current.includes(studentId)) return f;
        return { ...f, assignedStudentIds: [...current, studentId] };
      })
    );
  }, []);

  const unassignStudent = useCallback((studentId) => {
    setFurnitureOnCanvas((prev) =>
      prev.map((f) => ({
        ...f,
        assignedStudentIds: (f.assignedStudentIds || []).filter((id) => id !== studentId),
      }))
    );
  }, []);

  /** Map pointer to stage-local coords (same space as furniture `left`/`top`, which are children of `.canvasStage`). */
  const getCanvasCoords = useCallback((e) => {
    const stage = canvasStageRef.current;
    if (!stage) return null;
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    return { x, y };
  }, []);

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    try {
      const payload = JSON.parse(data);
      const coords = getCanvasCoords(e);
      if (!coords) {
        setDragState(null);
        setDropTargetId(null);
        return;
      }
      if (payload.type === "furniture" || payload.type === "canvas-furniture") {
        pushLayoutHistory();
      }
      if (payload.type === "furniture") {
        const def = FURNITURE_TYPES.find((t) => t.id === payload.furnitureId);
        if (!def) return;
        const existingFurnitureIds = new Set(furnitureOnCanvas.map((f) => f.id));
        let nextId;
        do {
          nextId = `f-${furnitureIdCounter++}`;
        } while (existingFurnitureIds.has(nextId));
        const snapped = getSnappedPosition(coords.x, coords.y, def.w, def.h, furnitureOnCanvas, null);
        setFurnitureOnCanvas((prev) => [
          ...prev,
          {
            id: nextId,
            type: payload.furnitureId,
            x: snapped.x,
            y: snapped.y,
            w: def.w,
            h: def.h,
            seats: def.seats,
            assignedStudentIds: [],
          },
        ]);
      } else if (payload.type === "canvas-furniture") {
        const moving = furnitureOnCanvas.find((f) => f.id === payload.furnitureId);
        if (!moving) return;
        const snapped = getSnappedPosition(coords.x, coords.y, moving.w, moving.h, furnitureOnCanvas, payload.furnitureId);
        setFurnitureOnCanvas((prev) =>
          prev.map((f) =>
            f.id === payload.furnitureId ? { ...f, x: snapped.x, y: snapped.y } : f
          )
        );
      }
    } catch (_) {}
    handleDragEnd();
  };

  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleFurnitureDragStart = (e, furnitureId) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "furniture", furnitureId }));
    e.dataTransfer.effectAllowed = "move";
    setDragState({ type: "furniture", furnitureId });
    const def = FURNITURE_TYPES.find((t) => t.id === furnitureId);
    if (def) {
      if (def.paletteImage) {
        const stretch = def.id === "desk" || def.id === "double-desk";
        const wrap = document.createElement("div");
        wrap.style.width = `${def.w}px`;
        wrap.style.height = `${def.h}px`;
        wrap.style.borderRadius = "4px";
        wrap.style.position = "absolute";
        wrap.style.top = "-9999px";
        wrap.style.left = "-9999px";
        wrap.style.pointerEvents = "none";
        wrap.style.overflow = "hidden";
        wrap.style.boxShadow = stretch ? "none" : "0 2px 6px rgba(0,0,0,0.2)";
        wrap.style.border = stretch ? "none" : "1px solid rgba(0,0,0,0.12)";
        const img = document.createElement("img");
        img.src = def.paletteImage;
        img.alt = "";
        img.draggable = false;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = stretch ? "fill" : "contain";
        img.style.objectPosition = "center";
        img.style.display = "block";
        wrap.appendChild(img);
        document.body.appendChild(wrap);
        dragImageRef.current = wrap;
        const setGhost = () => e.dataTransfer.setDragImage(wrap, def.w / 2, def.h / 2);
        if (img.complete && img.naturalWidth > 0) setGhost();
        else img.onload = setGhost;
      } else {
        const div = document.createElement("div");
        div.style.width = `${def.w}px`;
        div.style.height = `${def.h}px`;
        div.style.borderRadius = "4px";
        div.style.position = "absolute";
        div.style.top = "-9999px";
        div.style.left = "-9999px";
        div.style.pointerEvents = "none";
        div.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
        div.style.backgroundColor = def.color || "#8B4513";
        div.style.border = def.color ? "2px solid #0f172a" : "2px solid #654321";
        document.body.appendChild(div);
        dragImageRef.current = div;
        e.dataTransfer.setDragImage(div, def.w / 2, def.h / 2);
      }
    }
  };

  const handleCanvasFurnitureDragStart = (e, furnitureId) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "canvas-furniture", furnitureId }));
    e.dataTransfer.effectAllowed = "move";
    try {
      const f = furnitureOnCanvas.find((x) => x.id === furnitureId);
      if (f) {
        const def = FURNITURE_TYPES.find((t) => t.id === f.type) || FURNITURE_TYPES[0];
        const deskLabels = (f.assignedStudentIds || [])
          .map((sid) => deskLabelFromStudentName(students.find((s) => s.id === sid)?.name))
          .filter(Boolean);
        if (def.paletteImage) {
          const stretch = def.id === "desk" || def.id === "double-desk";
          const wrap = document.createElement("div");
          wrap.style.width = `${f.w}px`;
          wrap.style.height = `${f.h}px`;
          wrap.style.borderRadius = "4px";
          wrap.style.position = "absolute";
          wrap.style.top = "-9999px";
          wrap.style.left = "-9999px";
          wrap.style.pointerEvents = "none";
          wrap.style.overflow = "hidden";
          wrap.style.boxShadow = stretch ? "none" : "0 2px 6px rgba(0,0,0,0.2)";
          wrap.style.border = stretch ? "none" : "2px solid rgba(0,0,0,0.12)";
          const img = document.createElement("img");
          img.src = def.paletteImage;
          img.alt = "";
          img.draggable = false;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = stretch ? "fill" : "contain";
          img.style.objectPosition = "center";
          img.style.display = "block";
          wrap.appendChild(img);
          const appendDeskLabelOverlay = () => {
            if (def.seats === 0) {
              const span = document.createElement("span");
              span.style.fontSize = "12px";
              span.style.fontWeight = "500";
              span.style.textAlign = "center";
              span.style.lineHeight = "1.2";
              span.style.position = "absolute";
              span.style.left = "0";
              span.style.right = "0";
              span.style.top = "0";
              span.style.bottom = "0";
              span.style.zIndex = "1";
              span.style.display = "flex";
              span.style.alignItems = "center";
              span.style.justifyContent = "center";
              span.style.color = def.labelColor || "#fff";
              span.textContent = def.pieceLabel || "Front";
              wrap.appendChild(span);
              return;
            }
            if (deskLabels.length === 0) return;
            const mkNameSpan = (text) => {
              const span = document.createElement("span");
              span.style.fontSize = `${DESK_LABEL_FONT_PX}px`;
              span.style.fontWeight = "600";
              span.style.lineHeight = "1.15";
              span.style.color = "#fff";
              span.style.textShadow = DESK_LABEL_TEXT_SHADOW;
              span.style.textAlign = "center";
              span.style.overflow = "hidden";
              span.style.textOverflow = "ellipsis";
              span.style.whiteSpace = "nowrap";
              span.style.maxWidth = "100%";
              span.textContent = text;
              return span;
            };
            const appendFullWidthBand = () => {
              const slot = document.createElement("div");
              slot.style.position = "absolute";
              slot.style.left = "0";
              slot.style.right = "0";
              slot.style.top = DESK_LABEL_BAND_SINGLE.top;
              slot.style.height = DESK_LABEL_BAND_SINGLE.height;
              slot.style.display = "flex";
              slot.style.alignItems = "center";
              slot.style.justifyContent = "center";
              slot.style.zIndex = "1";
              slot.style.boxSizing = "border-box";
              slot.style.paddingLeft = "6px";
              slot.style.paddingRight = "6px";
              const span = mkNameSpan(deskLabels.length > 1 ? deskLabels.join(" · ") : deskLabels[0]);
              slot.appendChild(span);
              wrap.appendChild(slot);
            };
            if (def.id === "double-desk" && deskLabels.length === 2) {
              const mkHalf = (left, label) => {
                const half = document.createElement("div");
                half.style.position = "absolute";
                half.style.left = left;
                half.style.width = "50%";
                half.style.top = DESK_LABEL_BAND_DOUBLE_HALF.top;
                half.style.height = DESK_LABEL_BAND_DOUBLE_HALF.height;
                half.style.display = "flex";
                half.style.alignItems = "center";
                half.style.justifyContent = "center";
                half.style.zIndex = "1";
                half.style.boxSizing = "border-box";
                half.style.paddingLeft = "4px";
                half.style.paddingRight = "4px";
                half.appendChild(mkNameSpan(label));
                wrap.appendChild(half);
              };
              mkHalf("0", deskLabels[0]);
              mkHalf("50%", deskLabels[1]);
            } else {
              appendFullWidthBand();
            }
          };
          appendDeskLabelOverlay();
          document.body.appendChild(wrap);
          dragImageRef.current = wrap;
          const setGhost = () => e.dataTransfer.setDragImage(wrap, f.w / 2, f.h / 2);
          if (img.complete && img.naturalWidth > 0) setGhost();
          else img.onload = setGhost;
        } else {
          const div = document.createElement("div");
          div.style.width = `${f.w}px`;
          div.style.height = `${f.h}px`;
          div.style.borderRadius = "4px";
          div.style.position = "absolute";
          div.style.top = "-9999px";
          div.style.left = "-9999px";
          div.style.pointerEvents = "none";
          div.style.display = "flex";
          div.style.flexDirection = "column";
          div.style.alignItems = "center";
          div.style.justifyContent = "center";
          div.style.padding = "4px";
          div.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
          div.style.backgroundColor = def.color || "#8B4513";
          div.style.border = def.color ? "2px solid #0f172a" : "2px solid #654321";
          const span = document.createElement("span");
          span.style.fontSize = "12px";
          span.style.fontWeight = "500";
          span.style.textAlign = "center";
          span.style.lineHeight = "1.2";
          span.style.color = def.seats === 0 ? def.labelColor || "#fff" : "#fff";
          span.textContent = def.seats === 0 ? def.pieceLabel || "Front" : deskLabels.length > 0 ? deskLabels.join(", ") : "";
          if (span.textContent) div.appendChild(span);
          document.body.appendChild(div);
          dragImageRef.current = div;
          e.dataTransfer.setDragImage(div, f.w / 2, f.h / 2);
        }
      }
    } catch (_) {}
    // Defer state updates so they don't cancel the drag
    requestAnimationFrame(() => {
      setDragState({ type: "canvas-furniture", furnitureId });
      setSelectedFurnitureId(null);
    });
  };

  const handleDragEnd = () => {
    if (dragImageRef.current?.parentNode) {
      dragImageRef.current.parentNode.removeChild(dragImageRef.current);
      dragImageRef.current = null;
    }
    setDragState(null);
    setDropTargetId(null);
  };

  const handleStudentDragStart = (e, studentId) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "student", studentId }));
    e.dataTransfer.effectAllowed = "move";
    setDragState({ type: "student", studentId });
  };

  const handleTableDrop = (e, furnitureId) => {
    e.preventDefault();
    e.stopPropagation();
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    try {
      const payload = JSON.parse(data);
      if (payload.type === "student") {
        assignStudentToFurniture(payload.studentId, furnitureId);
      }
      // Ignore "canvas-furniture" and "furniture" - let canvas handle those
    } catch (_) {}
    setDropTargetId(null);
  };

  const handleTableDragOver = (e, furnitureId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragState?.type === "student") setDropTargetId(furnitureId);
  };

  const handleTableDragLeave = () => {
    setDropTargetId(null);
  };

  const handleShuffle = () => {
    const allStudentIds = students.map((s) => s.id);
    if (allStudentIds.length === 0) return;

    const slotsPerFurniture = furnitureOnCanvas
      .map((f) => {
        const def = FURNITURE_TYPES.find((t) => t.id === f.type) || FURNITURE_TYPES[0];
        const seats = def.seats != null ? def.seats : 1;
        return seats > 0 ? { id: f.id, seats } : null;
      })
      .filter(Boolean);
    const allSlots = slotsPerFurniture.flatMap(({ id, seats }) => Array(seats).fill(id));

    if (allStudentIds.length > allSlots.length) {
      alert(`Not enough seats for all students. You have ${allStudentIds.length} students but only ${allSlots.length} seat(s). Add more tables or remove some students.`);
      return;
    }

    pushLayoutHistory();

    const ADJ_THRESHOLD = 20;
    const areAdjacent = (f1, f2) => {
      const left1 = f1.x - f1.w / 2, right1 = f1.x + f1.w / 2, top1 = f1.y - f1.h / 2, bottom1 = f1.y + f1.h / 2;
      const left2 = f2.x - f2.w / 2, right2 = f2.x + f2.w / 2, top2 = f2.y - f2.h / 2, bottom2 = f2.y + f2.h / 2;
      const gapX = right1 < left2 ? left2 - right1 : (right2 < left1 ? left1 - right2 : 0);
      const gapY = bottom1 < top2 ? top2 - bottom1 : (bottom2 < top1 ? top1 - bottom2 : 0);
      const yOverlap = !(bottom1 <= top2 || bottom2 <= top1);
      const xOverlap = !(right1 <= left2 || right2 <= left1);
      return (gapX <= ADJ_THRESHOLD && yOverlap) || (gapY <= ADJ_THRESHOLD && xOverlap);
    };

    const adjacentSet = new Set();
    furnitureOnCanvas.forEach((f1, i) => {
      furnitureOnCanvas.forEach((f2, j) => {
        if (i < j && areAdjacent(f1, f2)) {
          adjacentSet.add([f1.id, f2.id].sort().join(","));
        }
      });
    });

    const cannotSitTogether = restrictions
      .filter((r) => r.type === "cannot_sit_together" && r.studentId1 && r.studentId2)
      .map((r) => [r.studentId1, r.studentId2]);

    const mustSitNearFront = restrictions
      .filter((r) => r.type === "must_sit_near_front" && r.studentId1)
      .map((r) => r.studentId1);

    const FRONT_NEAR_DISTANCE = 220;
    const frontPieces = furnitureOnCanvas.filter((f) => {
      const def = FURNITURE_TYPES.find((t) => t.id === f.type) || FURNITURE_TYPES[0];
      return (def.seats != null ? def.seats : 1) === 0;
    });
    const nearFrontFurnitureIds = new Set(
      furnitureOnCanvas
        .filter((f) => {
          const def = FURNITURE_TYPES.find((t) => t.id === f.type) || FURNITURE_TYPES[0];
          if ((def.seats != null ? def.seats : 1) === 0) return false;
          const distToFront = Math.min(
            ...frontPieces.map((front) => Math.hypot(f.x - front.x, f.y - front.y))
          );
          return distToFront <= FRONT_NEAR_DISTANCE;
        })
        .map((f) => f.id)
    );

    const violatesRestrictions = (studentToFurniture) => {
      for (const [s1, s2] of cannotSitTogether) {
        const f1 = studentToFurniture[s1];
        const f2 = studentToFurniture[s2];
        if (!f1 || !f2) continue;
        const key = [f1, f2].sort().join(",");
        if (adjacentSet.has(key)) return true;
      }
      for (const studentId of mustSitNearFront) {
        const fid = studentToFurniture[studentId];
        if (fid && !nearFrontFurnitureIds.has(fid)) return true;
      }
      return false;
    };

    let studentToFurniture = {};
    const maxTries = 300;
    let foundValid = false;
    const numToPlace = Math.min(allStudentIds.length, allSlots.length);
    for (let tryCount = 0; tryCount < maxTries; tryCount++) {
      const shuffledStudents = [...allStudentIds].sort(() => Math.random() - 0.5);
      const shuffledSlots = [...allSlots].sort(() => Math.random() - 0.5);
      studentToFurniture = {};
      for (let i = 0; i < numToPlace; i++) {
        studentToFurniture[shuffledStudents[i]] = shuffledSlots[i];
      }
      if (!violatesRestrictions(studentToFurniture)) {
        foundValid = true;
        break;
      }
    }
    if ((cannotSitTogether.length > 0 || mustSitNearFront.length > 0) && !foundValid) {
      alert("Could not place everyone while respecting all restrictions. Try adding more tables, moving tables farther apart, or placing tables closer to the front.");
    }

    setFurnitureOnCanvas((prev) =>
      prev.map((f) => ({
        ...f,
        assignedStudentIds: Object.entries(studentToFurniture)
          .filter(([, fid]) => fid === f.id)
          .map(([sid]) => sid),
      }))
    );
  };

  const handleReset = () => {
    pushLayoutHistory();
    setFurnitureOnCanvas([]);
    setSelectedFurnitureId(null);
  };

  const handleDuplicateFurniture = (furnitureId) => {
    const f = furnitureOnCanvas.find((x) => x.id === furnitureId);
    if (!f) return;
    pushLayoutHistory();
    const newId = `f-${furnitureIdCounter++}`;
    setFurnitureOnCanvas((prev) => [
      ...prev,
      {
        ...f,
        id: newId,
        x: f.x + 24,
        y: f.y + 24,
        assignedStudentIds: [],
      },
    ]);
    setSelectedFurnitureId(newId);
  };

  const handleDeleteFurniture = useCallback((furnitureId) => {
    pushLayoutHistory();
    setFurnitureOnCanvas((prev) => prev.filter((x) => x.id !== furnitureId));
    setSelectedFurnitureId(null);
  }, [pushLayoutHistory]);

  const handleRotateFurniture = (furnitureId) => {
    pushLayoutHistory();
    setFurnitureOnCanvas((prev) =>
      prev.map((f) =>
        f.id === furnitureId ? { ...f, rotation: ((f.rotation || 0) + 90) % 360 } : f
      )
    );
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      const target = document.activeElement;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (e.key === "Backspace" && selectedFurnitureId && !isInput) {
        e.preventDefault();
        handleDeleteFurniture(selectedFurnitureId);
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey && !isInput) {
          e.preventDefault();
          if (canUndo) undoLayout();
          return;
        }
        if ((e.key === "y" || (e.key === "z" && e.shiftKey)) && !isInput) {
          e.preventDefault();
          if (canRedo) redoLayout();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedFurnitureId, canUndo, canRedo, handleDeleteFurniture, undoLayout, redoLayout]);

  const handleSave = async () => {
    if (saving) return;
    setSaveMessage("");

    if (!user?.uid) {
      router.push(`/login?redirectTo=${encodeURIComponent("/seating-chart")}`);
      return;
    }

    const data = {
      chartName,
      students,
      furniture: furnitureOnCanvas.map(withCurrentFurnitureSize),
      restrictions,
      savedAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      await saveUserSeatingChart({
        uid: user.uid,
        chartName: data.chartName,
        students: data.students,
        furniture: data.furniture,
        restrictions: data.restrictions,
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (_) {}
      setSaveMessage("Saved to your account.");
    } catch (err) {
      setSaveMessage(err.message || "Failed to save chart.");
    } finally {
      setSaving(false);
    }
  };

  const openManageStudents = () => {
    setManageStudentsText(students.map((s) => s.name).join("\n"));
    setSheetAnimated(false);
    setShowManageStudents(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setSheetAnimated(true)));
  };

  const openManageRestrictions = () => {
    setRestrictionsSheetAnimated(false);
    setShowManageRestrictions(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setRestrictionsSheetAnimated(true)));
  };

  const addRestriction = () => {
    const existingIds = new Set(restrictions.map((r) => r.id));
    let nextId;
    do {
      nextId = `r-${restrictionIdCounter++}`;
    } while (existingIds.has(nextId));

    if (newRestrictionType === "cannot_sit_together") {
      const id1 = newRestrictionStudent1.trim();
      const id2 = newRestrictionStudent2.trim();
      if (!id1 || !id2 || id1 === id2) return;
      setRestrictions((prev) => [
        ...prev,
        {
          id: nextId,
          type: newRestrictionType,
          studentId1: id1,
          studentId2: id2,
        },
      ]);
      setNewRestrictionStudent1("");
      setNewRestrictionStudent2("");
    } else if (newRestrictionType === "must_sit_near_front") {
      const id1 = newRestrictionStudent1.trim();
      if (!id1) return;
      setRestrictions((prev) => [
        ...prev,
        {
          id: nextId,
          type: newRestrictionType,
          studentId1: id1,
          studentId2: null,
        },
      ]);
      setNewRestrictionStudent1("");
    }
  };

  const removeRestriction = (id) => {
    setRestrictions((prev) => prev.filter((r) => r.id !== id));
  };

  const saveManageStudents = () => {
    const names = manageStudentsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const newStudents = names.map((name, i) => {
      const existing = students.find((s) => s.name === name);
      if (existing) return existing;
      return {
        id: `s-${studentIdCounter++}`,
        name,
        color: STUDENT_COLORS[i % STUDENT_COLORS.length],
      };
    });
    const newIds = new Set(newStudents.map((s) => s.id));
    setStudents(newStudents);
    setFurnitureOnCanvas((prev) =>
      prev.map((f) => ({
        ...f,
        assignedStudentIds: (f.assignedStudentIds || []).filter((sid) => newIds.has(sid)),
      }))
    );
    setShowManageStudents(false);
  };

  const renderFurnitureShape = (f, isDropTarget, idx = 0) => {
    const piece = withCurrentFurnitureSize(f);
    const def = FURNITURE_TYPES.find((t) => t.id === piece.type) || FURNITURE_TYPES[0];
    const deskStudentLabels = (piece.assignedStudentIds || [])
      .map((sid) => deskLabelFromStudentName(students.find((s) => s.id === sid)?.name))
      .filter(Boolean);
    const isSelected = selectedFurnitureId === piece.id;
    const isDragging = dragState?.type === "canvas-furniture" && dragState?.furnitureId === piece.id;
    const rotation = piece.rotation || 0;

    const pieceBorder = isDropTarget ? "3px solid #3b82f6" : "2px solid rgba(0,0,0,0.15)";
    const deskStretchArt = def.paletteImage && (def.id === "desk" || def.id === "double-desk");
    const pieceBorderSolid = !def.paletteImage && (def.color ? "2px solid #0f172a" : "2px solid #654321");
    const paletteBorder = isDropTarget ? pieceBorder : "none";

    const tableEl = (
      <div
        key={`${piece.id}-${idx}`}
        draggable={true}
        onDragStart={(e) => {
          e.stopPropagation();
          handleCanvasFurnitureDragStart(e, piece.id);
        }}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedFurnitureId(piece.id);
        }}
        className={`absolute cursor-grab active:cursor-grabbing select-none touch-none${def.paletteImage ? " overflow-hidden" : " rounded"}`}
        style={{
          left: piece.x,
          top: piece.y,
          width: piece.w,
          height: piece.h,
          transform: `translate3d(-50%, -50%, 0) rotate(${rotation}deg)`,
          backgroundColor: def.paletteImage ? "transparent" : def.color || "#8B4513",
          border: def.paletteImage ? paletteBorder : isDropTarget ? pieceBorder : pieceBorderSolid,
          boxShadow: deskStretchArt ? "none" : "0 2px 6px rgba(0,0,0,0.2)",
          display: def.paletteImage ? "block" : "flex",
          flexDirection: def.paletteImage ? undefined : "column",
          alignItems: def.paletteImage ? undefined : "center",
          justifyContent: def.paletteImage ? undefined : "center",
          padding: def.paletteImage ? 0 : 4,
          opacity: isDragging ? 0 : 1,
          pointerEvents: isDragging ? "none" : "auto",
          zIndex: isSelected ? 10 : 1,
          WebkitUserDrag: "element",
          userSelect: "none",
        }}
        onDrop={(e) => handleTableDrop(e, f.id)}
        onDragOver={(e) => handleTableDragOver(e, f.id)}
        onDragLeave={handleTableDragLeave}
      >
        {def.paletteImage ? (
          <img
            src={def.paletteImage}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              objectFit: deskStretchArt ? "fill" : "contain",
              objectPosition: "center",
              pointerEvents: "none",
              userSelect: "none",
              display: "block",
              zIndex: 0,
            }}
          />
        ) : null}
        {def.seats === 0 ? (
          <span
            className="text-xs font-medium text-center leading-tight pointer-events-none"
            style={{
              color: def.labelColor || "rgba(255,255,255,0.95)",
              position: def.paletteImage ? "absolute" : "relative",
              left: def.paletteImage ? 0 : undefined,
              right: def.paletteImage ? 0 : undefined,
              top: def.paletteImage ? 0 : undefined,
              bottom: def.paletteImage ? 0 : undefined,
              zIndex: 1,
              display: def.paletteImage ? "flex" : undefined,
              alignItems: def.paletteImage ? "center" : undefined,
              justifyContent: def.paletteImage ? "center" : undefined,
            }}
          >
            {def.pieceLabel || "Front"}
          </span>
        ) : deskStudentLabels.length > 0 ? (
          def.paletteImage && deskStretchArt ? (
            def.id === "double-desk" && deskStudentLabels.length === 2 ? (
              <>
                <div
                  className="pointer-events-none"
                  style={{
                    position: "absolute",
                    left: 0,
                    width: "50%",
                    top: DESK_LABEL_BAND_DOUBLE_HALF.top,
                    height: DESK_LABEL_BAND_DOUBLE_HALF.height,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                    boxSizing: "border-box",
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: DESK_LABEL_FONT_PX,
                      fontWeight: 600,
                      lineHeight: 1.15,
                      color: "#fff",
                      textAlign: "center",
                      textShadow: DESK_LABEL_TEXT_SHADOW,
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {deskStudentLabels[0]}
                  </span>
                </div>
                <div
                  className="pointer-events-none"
                  style={{
                    position: "absolute",
                    left: "50%",
                    width: "50%",
                    top: DESK_LABEL_BAND_DOUBLE_HALF.top,
                    height: DESK_LABEL_BAND_DOUBLE_HALF.height,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                    boxSizing: "border-box",
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: DESK_LABEL_FONT_PX,
                      fontWeight: 600,
                      lineHeight: 1.15,
                      color: "#fff",
                      textAlign: "center",
                      textShadow: DESK_LABEL_TEXT_SHADOW,
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {deskStudentLabels[1]}
                  </span>
                </div>
              </>
            ) : (
              <div
                className="pointer-events-none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: DESK_LABEL_BAND_SINGLE.top,
                  height: DESK_LABEL_BAND_SINGLE.height,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1,
                  boxSizing: "border-box",
                  paddingLeft: 6,
                  paddingRight: 6,
                }}
              >
                <span
                  style={{
                    fontSize: DESK_LABEL_FONT_PX,
                    fontWeight: 600,
                    lineHeight: 1.15,
                    color: "#fff",
                    textAlign: "center",
                    textShadow: DESK_LABEL_TEXT_SHADOW,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {deskStudentLabels.length > 1 ? deskStudentLabels.join(" · ") : deskStudentLabels[0]}
                </span>
              </div>
            )
          ) : (
            <span
              className="text-xs font-medium text-center leading-tight pointer-events-none"
              style={{
                color: "#fff",
                textShadow: DESK_LABEL_TEXT_SHADOW,
                position: def.paletteImage ? "absolute" : "relative",
                left: def.paletteImage ? 0 : undefined,
                right: def.paletteImage ? 0 : undefined,
                bottom: def.paletteImage ? 6 : undefined,
                zIndex: 1,
                display: def.paletteImage ? "block" : undefined,
                textAlign: "center",
              }}
            >
              {deskStudentLabels.join(", ")}
            </span>
          )
        ) : null}
      </div>
    );

    if (!isSelected) return tableEl;

    const pad = 8;
    const boxW = piece.w + pad * 2;
    const boxH = piece.h + pad * 2;

    return (
      <React.Fragment key={`${f.id}-${idx}`}>
        {/* Selection UI: bounding box + controls (sibling of table, so table stays draggable) */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: f.x,
            top: f.y,
            width: 0,
            height: 0,
            transform: `translate3d(-50%, -50%, 0) rotate(${rotation}deg)`,
          }}
        >
          <div
            className="absolute rounded border-2 border-white bg-transparent"
            style={{
              left: -boxW / 2,
              top: -boxH / 2,
              width: boxW,
              height: boxH,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
            }}
          />
          <div className="absolute" style={{ left: -boxW / 2 - CONTROL_LINE_LENGTH - 28, top: -boxH / 2 - CONTROL_LINE_LENGTH - 28 }}>
            <div className="absolute bg-muted-foreground/50" style={{ width: CONTROL_LINE_LENGTH + 16, height: 2, left: 16, top: 15 }} />
            <div className="absolute bg-muted-foreground/50" style={{ width: 2, height: CONTROL_LINE_LENGTH + 16, left: 15, top: 0 }} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDuplicateFurniture(f.id); }}
              className="absolute w-9 h-9 rounded-full bg-[#3b82f6] text-white flex items-center justify-center shadow-md hover:opacity-90 left-0 top-0 pointer-events-auto border-0 cursor-pointer"
              title="Duplicate"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <div className="absolute" style={{ left: boxW / 2 + CONTROL_LINE_LENGTH - 10, top: -boxH / 2 - CONTROL_LINE_LENGTH - 28 }}>
            <div className="absolute bg-muted-foreground/50" style={{ width: CONTROL_LINE_LENGTH + 16, height: 2, right: 16, top: 15, left: "auto" }} />
            <div className="absolute bg-muted-foreground/50" style={{ width: 2, height: CONTROL_LINE_LENGTH + 16, right: 15, top: 0, left: "auto" }} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDeleteFurniture(f.id); }}
              className="absolute w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:opacity-90 right-0 top-0 pointer-events-auto border-0 cursor-pointer"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div className="absolute" style={{ left: -boxW / 2 - CONTROL_LINE_LENGTH - 28, top: boxH / 2 + CONTROL_LINE_LENGTH - 10 }}>
            <div className="absolute bg-muted-foreground/50" style={{ width: CONTROL_LINE_LENGTH + 16, height: 2, left: 16, bottom: 15, top: "auto" }} />
            <div className="absolute bg-muted-foreground/50" style={{ width: 2, height: CONTROL_LINE_LENGTH + 16, left: 15, bottom: 16, top: "auto" }} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRotateFurniture(f.id); }}
              className="absolute w-9 h-9 rounded-full bg-[#3b82f6] text-white flex items-center justify-center shadow-md hover:opacity-90 left-0 bottom-0 pointer-events-auto border-0 cursor-pointer"
              title="Rotate"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        {tableEl}
      </React.Fragment>
    );
  };

  const shuffleDisabled = useMemo(() => {
    if (students.length === 0) return true;
    const totalSeats = furnitureOnCanvas.reduce((sum, f) => {
      const def = FURNITURE_TYPES.find((t) => t.id === f.type) || FURNITURE_TYPES[0];
      const seats = def.seats != null ? def.seats : 1;
      return sum + (seats > 0 ? seats : 0);
    }, 0);
    return totalSeats === 0;
  }, [students, furnitureOnCanvas]);

  /** Large palette previews — desks share one scale so two singles match one double. */
  const paletteThumbSize = (def) => {
    const mw = 142;
    const mh = 72;
    if (def.id === "desk" || def.id === "double-desk") {
      const deskScale = Math.min(mw / DOUBLE_DESK_CANVAS_W, mh / DESK_CANVAS_H);
      return { width: def.w * deskScale, height: def.h * deskScale };
    }
    const scale = Math.min(mw / def.w, mh / def.h, 1);
    return { width: def.w * scale, height: def.h * scale };
  };

  return (
    <div className={`min-h-screen bg-background flex flex-col ${styles.scRoot} ${seatingOpenSans.variable} ${seatingLexendDeca.variable}`}>
      <DashboardTopBar title="Code4Community" showNavLinks={true} />

      <div className={`${styles.componentContainer} flex-1 flex flex-col min-h-0`}>
        <div className={styles.mainContainer}>
          <aside className={`${styles.sidePanel} side-panel visible`} aria-label="Chart tools">
            <div className={`${styles.chartNameInput} chart-name-input`}>
              <input
                type="text"
                name="chartName"
                maxLength={64}
                value={chartName}
                onChange={(e) => setChartName(e.target.value)}
                placeholder="Seating chart name"
                aria-label="Seating chart name"
              />
            </div>
            <div className={`${styles.sidePanelWrapper} side-panel-wrapper`}>
              <div className={`${styles.sidePanelTabs} side-panel-header`} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "furniture"}
                  onClick={() => setActiveTab("furniture")}
                  className={`${styles.sidePanelTab} side-panel-button ${activeTab === "furniture" ? styles.sidePanelTabActive : ""}`}
                >
                  Furniture
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "students"}
                  onClick={() => setActiveTab("students")}
                  className={`${styles.sidePanelTab} side-panel-button ${activeTab === "students" ? styles.sidePanelTabActive : ""}`}
                >
                  Students
                </button>
              </div>
              <div className={`${styles.sidePanelBody} side-panel-body`}>
                <button
                  type="button"
                  className={`${styles.scrollButton} ${styles.scrollButtonTop} scroll-button-top ${!sidePanelScroll.showUp ? styles.scrollButtonHidden : ""}`}
                  onClick={() => scrollSidePanelBy(-120)}
                  aria-label="Scroll palette up"
                >
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div
                  ref={sidePanelScrollRef}
                  className={`${styles.sidePanelContentWrapper} side-panel-content-wrapper`}
                  style={sidePanelScroll.showUp ? { paddingTop: 40 } : undefined}
                >
                  {activeTab === "furniture" ? (
                    <div className={`${styles.sidePanelContent} side-panel-content furniture`}>
                      <div className={styles.furnitureGrid}>
                        {FURNITURE_TYPES.map((def) => {
                          const { width, height } = paletteThumbSize(def);
                          return (
                            <div
                              key={def.id}
                              draggable
                              onDragStart={(e) => handleFurnitureDragStart(e, def.id)}
                              className={`${styles.furniturePaletteItem} gynzy-furniture-item`}
                              data-uid={def.id}
                              style={{ cursor: "pointer" }}
                              aria-label={def.id.replace(/-/g, " ")}
                            >
                              {def.paletteImage ? (
                                <img
                                  src={def.paletteImage}
                                  alt=""
                                  className={styles.furniturePaletteImg}
                                  draggable={false}
                                  style={{
                                    width,
                                    height,
                                    objectFit: def.id === "desk" || def.id === "double-desk" ? "fill" : "contain",
                                  }}
                                />
                              ) : (
                                <div
                                  className={styles.furniturePaletteThumb}
                                  style={{
                                    width,
                                    height,
                                    backgroundColor: def.color || "#8B4513",
                                    border: "none",
                                    boxShadow: "none",
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className={`${styles.sidePanelContent} side-panel-content students`}>
                      <p className={styles.studentsHint}>Drag a student onto a table to assign a seat. Colors are assigned when you save the class list.</p>
                      <div className={styles.colorRow}>
                        {STUDENT_COLORS.map((c) => (
                          <div key={c} className={styles.colorSwatch} style={{ backgroundColor: c }} title="Palette color" />
                        ))}
                      </div>
                      {students.length === 0 ? (
                        <p className={styles.studentsHint}>No students yet. Use Student settings below to add names.</p>
                      ) : (
                        students.map((s) => (
                          <div
                            key={s.id}
                            draggable
                            onDragStart={(e) => handleStudentDragStart(e, s.id)}
                            className={styles.studentPaletteRow}
                          >
                            <div className={styles.studentDot} style={{ backgroundColor: s.color }} />
                            <span className={styles.studentName}>{s.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {sidePanelScroll.showDown ? (
                  <div className={styles.sidePanelScrollFooter}>
                    <button
                      type="button"
                      className={styles.sidePanelScrollFooterBtn}
                      onClick={() => scrollSidePanelBy(120)}
                      aria-label="Scroll palette down"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>

          <div className={`${styles.editorPanel} editor-panel`}>
            <div className={`${styles.furnitureWrapper} furniture-wrapper`} data-drop-zone="furniture-wrapper">
              <div
                ref={canvasRef}
                onDrop={handleCanvasDrop}
                onDragOver={handleCanvasDragOver}
                onClick={() => setSelectedFurnitureId(null)}
                className={`${styles.canvasDropZone} furniture-container`}
                data-drop-zone="furniture-container"
              >
                <div
                  className={`${styles.placeholder} placeholder ${furnitureOnCanvas.length > 0 ? styles.placeholderHidden : ""}`}
                  aria-hidden={furnitureOnCanvas.length > 0}
                >
                  <svg className={styles.placeholderIcon} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <rect x="8" y="20" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                    <rect x="34" y="20" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.5" />
                    <path d="M20 36v8M44 36v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M28 12h8l4 8H24l4-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                  <p className={`${styles.placeholderText} placeholder-text`}>Drag furniture to this window</p>
                </div>
                <div
                  ref={canvasScrollRef}
                  className={styles.canvasInnerScroll}
                  onDragOver={handleCanvasDragOver}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCanvasDrop(e);
                  }}
                >
                  <div
                    ref={canvasStageRef}
                    className={styles.canvasStage}
                    style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
                  >
                    {furnitureOnCanvas.map((f, idx) => renderFurnitureShape(f, dropTargetId === f.id, idx))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.controlButtonsContainer} control-buttons-container`}>
          <div className={styles.controlLeft}>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary} student-settings-button`} onClick={openManageStudents}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Student settings
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={openManageRestrictions}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Restrictions
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.iconBtn}`} onClick={undoLayout} disabled={!canUndo} title="Undo (⌘Z)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.iconBtn}`} onClick={redoLayout} disabled={!canRedo} title="Redo (⌘⇧Z)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>
          <div className={styles.buttonGroup}>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary} cancel-button`} onClick={() => window.history.back()}>
              Cancel
            </button>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary} save-button`}
                onClick={handleSave}
                disabled={saving}
                title={user ? "Save chart to your account" : "Sign in to save to your account"}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {saveMessage ? (
                <span
                  className="text-xs max-w-[12rem] text-right"
                  style={{ color: saveMessage.includes("Failed") ? "#b91c1c" : "#15803d" }}
                >
                  {saveMessage}
                </span>
              ) : null}
            </div>
          </div>
          <div className={styles.buttonGroup}>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary} shuffle-button`} onClick={handleShuffle} disabled={shuffleDisabled} title={shuffleDisabled ? "Add students and seatable furniture to shuffle" : "Randomize seating"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
              Shuffle
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary} reset-button`} onClick={handleReset}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 0115-6.7L21 8M3 12a9 9 0 0015 6.7L21 16M21 8v4h-4M21 16v-4h-4" />
              </svg>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Students bottom sheet - slides up from bottom */}
      {showManageStudents && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 transition-opacity"
          onClick={() => setShowManageStudents(false)}
          aria-modal="true"
          role="dialog"
          aria-labelledby="students-sheet-title"
        >
          <div
            className={`bg-white dark:bg-neutral-900 w-full max-h-[70vh] flex flex-col rounded-t-2xl shadow-2xl overflow-hidden transition-transform duration-300 ease-out ${sheetAnimated ? "translate-y-0" : "translate-y-full"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 pt-4 pb-2 px-6">
              <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 mx-auto mb-4" aria-hidden />
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h2 id="students-sheet-title" className="text-xl font-semibold text-neutral-900 dark:text-white">Students</h2>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Enter student names on separate lines.</p>
            </div>
            <div className="flex-1 min-h-0 px-6 pb-4 overflow-auto">
              <textarea
                value={manageStudentsText}
                onChange={(e) => setManageStudentsText(e.target.value)}
                placeholder={"e.g. John Smith\nJane Doe"}
                rows={8}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-4 py-3 text-base placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y min-h-[180px] mt-4"
                aria-label="Student names, one per line"
              />
            </div>
            <div className="flex-shrink-0 px-6 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowManageStudents(false)}
                className="px-4 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveManageStudents}
                className="px-4 py-2 rounded-lg bg-[#3b82f6] text-white hover:bg-[#2563eb] font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restrictions bottom sheet - placeholder */}
      {showManageRestrictions && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 transition-opacity"
          onClick={() => setShowManageRestrictions(false)}
          aria-modal="true"
          role="dialog"
          aria-labelledby="restrictions-sheet-title"
        >
          <div
            className={`bg-white dark:bg-neutral-900 w-full max-h-[70vh] flex flex-col rounded-t-2xl shadow-2xl overflow-hidden transition-transform duration-300 ease-out ${restrictionsSheetAnimated ? "translate-y-0" : "translate-y-full"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 pt-4 pb-2 px-6">
              <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 mx-auto mb-4" aria-hidden />
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h2 id="restrictions-sheet-title" className="text-xl font-semibold text-neutral-900 dark:text-white">Restrictions</h2>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Set seating restrictions (e.g. who cannot sit next to whom).</p>
            </div>
            <div className="flex-1 min-h-0 px-6 py-4 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="py-2 pr-4 font-semibold text-neutral-900 dark:text-white">Restriction type</th>
                    <th className="py-2 pr-4 font-semibold text-neutral-900 dark:text-white">Details</th>
                    <th className="py-2 w-10" aria-label="Remove" />
                  </tr>
                </thead>
                <tbody>
                  {restrictions.map((r, idx) => {
                    const typeLabel = RESTRICTION_TYPES.find((t) => t.id === r.type)?.label || r.type;
                    const name1 = students.find((s) => s.id === r.studentId1)?.name ?? r.studentId1;
                    const name2 = students.find((s) => s.id === r.studentId2)?.name ?? r.studentId2;
                    const details = r.type === "cannot_sit_together" ? `${name1} / ${name2}` : r.type === "must_sit_near_front" ? name1 : "";
                    return (
                      <tr key={`${r.id}-${idx}`} className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="py-2 pr-4 text-sm text-neutral-700 dark:text-neutral-300">{typeLabel}</td>
                        <td className="py-2 pr-4 text-sm text-neutral-600 dark:text-neutral-400">{details}</td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => removeRestriction(r.id)}
                            className="text-neutral-500 hover:text-red-500 text-sm"
                            aria-label="Remove restriction"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Add new restriction</p>
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-500 dark:text-neutral-400">Restriction type</label>
                    <select
                      value={newRestrictionType}
                      onChange={(e) => setNewRestrictionType(e.target.value)}
                      className="border border-neutral-300 dark:border-neutral-600 rounded-md px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm min-w-[180px]"
                    >
                      {RESTRICTION_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    {newRestrictionType === "cannot_sit_together" && (
                      <>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-neutral-500 dark:text-neutral-400">Student 1</label>
                          <select
                            value={newRestrictionStudent1}
                            onChange={(e) => setNewRestrictionStudent1(e.target.value)}
                            className="border border-neutral-300 dark:border-neutral-600 rounded-md px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm min-w-[140px]"
                          >
                            <option value="">Select…</option>
                            {students.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-neutral-500 dark:text-neutral-400">Student 2</label>
                          <select
                            value={newRestrictionStudent2}
                            onChange={(e) => setNewRestrictionStudent2(e.target.value)}
                            className="border border-neutral-300 dark:border-neutral-600 rounded-md px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm min-w-[140px]"
                          >
                            <option value="">Select…</option>
                            {students.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={addRestriction}
                          className="py-2 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                        >
                          Add
                        </button>
                      </>
                    )}
                    {newRestrictionType === "must_sit_near_front" && (
                      <>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-neutral-500 dark:text-neutral-400">Student</label>
                          <select
                            value={newRestrictionStudent1}
                            onChange={(e) => setNewRestrictionStudent1(e.target.value)}
                            className="border border-neutral-300 dark:border-neutral-600 rounded-md px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm min-w-[140px]"
                          >
                            <option value="">Select…</option>
                            {students.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={addRestriction}
                          className="py-2 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                        >
                          Add
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 px-6 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowManageRestrictions(false)}
                className="px-4 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
