"use client";
import React, { useState, useLayoutEffect, useRef, useCallback, useEffect } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";

// Furniture type definitions: { id, label, seats, w, h, color? }
const FURNITURE_TYPES = [
  { id: "table-1", label: "Single table", seats: 1, w: 80, h: 60 },
  { id: "promethean", label: "Promethean board", seats: 0, w: 180, h: 55, color: "#1e293b" },
];

const STUDENT_COLORS = ["#ef4444", "#f97316", "#22c55e", "#3b82f6", "#a855f7"];

let furnitureIdCounter = 1;
let studentIdCounter = 1;
let restrictionIdCounter = 1;

const RESTRICTION_TYPES = [
  { id: "cannot_sit_together", label: "Cannot sit together" },
  { id: "must_sit_near_front", label: "Must sit near front" },
];

const SNAP_THRESHOLD = 24;

function getSnappedPosition(dropX, dropY, movingW, movingH, otherFurniture, excludeId) {
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

  const [chartName, setChartName] = useState("");
  const [activeTab, setActiveTab] = useState("furniture");
  const [students, setStudents] = useState([]);
  const [furnitureOnCanvas, setFurnitureOnCanvas] = useState([]);
  const [restrictions, setRestrictions] = useState([]);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showManageStudents, setShowManageStudents] = useState(false);
  const [manageStudentsText, setManageStudentsText] = useState("");
  const [sheetAnimated, setSheetAnimated] = useState(false);
  const [showManageRestrictions, setShowManageRestrictions] = useState(false);
  const [restrictionsSheetAnimated, setRestrictionsSheetAnimated] = useState(false);

  useEffect(() => {
    if (hasLoadedFromStorage) return;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) {
        setHasLoadedFromStorage(true);
        return;
      }
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        if (data.chartName != null) setChartName(String(data.chartName));
        if (Array.isArray(data.students)) setStudents(data.students.length > 0 ? data.students : []);
        if (Array.isArray(data.furniture)) setFurnitureOnCanvas(data.furniture);
        if (Array.isArray(data.restrictions)) setRestrictions(data.restrictions);
        const fNums = (data.furniture || []).map((f) => parseInt(String(f.id).replace(/^f-/, ""), 10)).filter((n) => !Number.isNaN(n));
        const sNums = (data.students || []).map((s) => parseInt(String(s.id).replace(/^s-/, ""), 10)).filter((n) => !Number.isNaN(n));
        const rNums = (data.restrictions || []).map((r) => parseInt(String(r.id).replace(/^r-/, ""), 10)).filter((n) => !Number.isNaN(n));
        if (fNums.length > 0) furnitureIdCounter = Math.max(...fNums, furnitureIdCounter) + 1;
        if (sNums.length > 0) studentIdCounter = Math.max(...sNums, studentIdCounter) + 1;
        if (rNums.length > 0) restrictionIdCounter = Math.max(...rNums, restrictionIdCounter) + 1;
      }
    } catch (_) {}
    setHasLoadedFromStorage(true);
  }, [hasLoadedFromStorage]);
  const [newRestrictionType, setNewRestrictionType] = useState("cannot_sit_together");
  const [newRestrictionStudent1, setNewRestrictionStudent1] = useState("");
  const [newRestrictionStudent2, setNewRestrictionStudent2] = useState("");
  const canvasRef = useRef(null);
  const canvasScrollRef = useRef(null);
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

  const getCanvasCoords = useCallback((e) => {
    const scrollEl = canvasScrollRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !scrollEl) return null;
    const scrollLeft = scrollEl.scrollLeft || 0;
    const scrollTop = scrollEl.scrollTop || 0;
    const x = (e.clientX - rect.left + scrollLeft) / zoom;
    const y = (e.clientY - rect.top + scrollTop) / zoom;
    return { x, y };
  }, [zoom]);

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
      const div = document.createElement("div");
      div.style.width = `${def.w}px`;
      div.style.height = `${def.h}px`;
      div.style.backgroundColor = def.color || "#8B4513";
      div.style.borderRadius = "4px";
      div.style.border = def.color ? "2px solid #0f172a" : "2px solid #654321";
      div.style.position = "absolute";
      div.style.top = "-9999px";
      div.style.left = "-9999px";
      div.style.pointerEvents = "none";
      div.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
      document.body.appendChild(div);
      dragImageRef.current = div;
      e.dataTransfer.setDragImage(div, def.w / 2, def.h / 2);
    }
  };

  const handleCanvasFurnitureDragStart = (e, furnitureId) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "canvas-furniture", furnitureId }));
    e.dataTransfer.effectAllowed = "move";
    try {
      const f = furnitureOnCanvas.find((x) => x.id === furnitureId);
      if (f) {
        const def = FURNITURE_TYPES.find((t) => t.id === f.type) || FURNITURE_TYPES[0];
        const names = (f.assignedStudentIds || [])
          .map((sid) => students.find((s) => s.id === sid)?.name)
          .filter(Boolean);
        const div = document.createElement("div");
        div.style.width = `${f.w}px`;
        div.style.height = `${f.h}px`;
        div.style.backgroundColor = def.color || "#8B4513";
        div.style.borderRadius = "4px";
        div.style.border = def.color ? "2px solid #0f172a" : "2px solid #654321";
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
        const span = document.createElement("span");
        span.style.color = "white";
        span.style.fontSize = "12px";
        span.style.fontWeight = "500";
        span.style.textAlign = "center";
        span.style.lineHeight = "1.2";
        span.textContent = def.seats === 0 ? "Front" : names.length > 0 ? names.join(", ") : "";
        if (span.textContent) div.appendChild(span);
        document.body.appendChild(div);
        dragImageRef.current = div;
        e.dataTransfer.setDragImage(div, f.w / 2, f.h / 2);
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
      alert(`Not enough seats for all participants. You have ${allStudentIds.length} participants but only ${allSlots.length} seat(s). Add more tables or remove some participants.`);
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

  const handleSave = () => {
    const data = {
      chartName,
      students,
      furniture: furnitureOnCanvas,
      restrictions,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    alert("Seating chart saved. Your chart will be restored when you return or refresh.");
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
    const def = FURNITURE_TYPES.find((t) => t.id === f.type) || FURNITURE_TYPES[0];
    const studentNames = (f.assignedStudentIds || [])
      .map((sid) => students.find((s) => s.id === sid)?.name)
      .filter(Boolean);
    const isSelected = selectedFurnitureId === f.id;
    const isDragging = dragState?.type === "canvas-furniture" && dragState?.furnitureId === f.id;
    const rotation = f.rotation || 0;

    const tableEl = (
      <div
        key={`${f.id}-${idx}`}
        draggable={true}
        onDragStart={(e) => {
          e.stopPropagation();
          handleCanvasFurnitureDragStart(e, f.id);
        }}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedFurnitureId(f.id);
        }}
        className="absolute rounded cursor-grab active:cursor-grabbing select-none touch-none"
        style={{
          left: f.x,
          top: f.y,
          width: f.w,
          height: f.h,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          backgroundColor: def.color || "#8B4513",
          border: isDropTarget ? "3px solid #3b82f6" : def.color ? "2px solid #0f172a" : "2px solid #654321",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 4,
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
        {def.seats === 0 ? (
          <span className="text-white/90 text-xs font-medium text-center leading-tight pointer-events-none">Front</span>
        ) : studentNames.length > 0 ? (
          <span className="text-white text-xs font-medium text-center leading-tight pointer-events-none">
            {studentNames.join(", ")}
          </span>
        ) : null}
      </div>
    );

    if (!isSelected) return tableEl;

    const pad = 8;
    const boxW = f.w + pad * 2;
    const boxH = f.h + pad * 2;

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
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Code4Community" showNavLinks={true} />

      <div className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full">
        <input
          type="text"
          value={chartName}
          onChange={(e) => setChartName(e.target.value)}
          className="text-lg font-semibold border border-border rounded-md px-3 py-2 mb-4 w-full max-w-md bg-background text-foreground"
          placeholder="Seating chart name"
        />

        <div className="flex flex-1 min-h-0 gap-4">
          {/* Left panel */}
          <div className="w-56 flex-shrink-0 flex flex-col border border-border rounded-lg bg-muted/30 overflow-hidden">
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setActiveTab("furniture")}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === "furniture" ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                Furniture
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("students")}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === "students" ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                Participants
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {activeTab === "furniture" && (
                <div className="space-y-3">
                  {FURNITURE_TYPES.map((def) => (
                    <div
                      key={def.id}
                      draggable
                      onDragStart={(e) => handleFurnitureDragStart(e, def.id)}
                      className="flex flex-col items-center p-3 rounded-lg border-2 border-border bg-background cursor-grab active:cursor-grabbing hover:border-primary/50"
                    >
                      <div
                        className="rounded border"
                        style={{
                          width: Math.min(def.w * 0.5, 72),
                          height: Math.min(def.h * 0.6, 36),
                          backgroundColor: def.color || "#8B4513",
                          borderColor: def.color ? "#0f172a" : "#654321",
                        }}
                      />
                      <span className="text-xs text-foreground mt-2 text-center">{def.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "students" && (
                <div className="space-y-3">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="w-full text-xs text-muted-foreground">Color</span>
                    {STUDENT_COLORS.map((c) => (
                      <div
                        key={c}
                        className="w-6 h-6 rounded-full border-2 border-border"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {students.map((s) => (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={(e) => handleStudentDragStart(e, s.id)}
                        className="flex items-center gap-2 p-2 rounded border border-border bg-background cursor-grab active:cursor-grabbing hover:border-primary/50"
                      >
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-sm text-foreground truncate flex-1">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
            onClick={() => setSelectedFurnitureId(null)}
            className="flex-1 min-h-[400px] rounded-lg border-2 border-dashed border-border bg-muted/20 relative overflow-hidden"
          >
            <div
              ref={canvasScrollRef}
              className="absolute inset-0 overflow-auto"
              style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCanvasDrop(e);
              }}
            >
              <div
                className="relative bg-muted/10"
                style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
              >
                {furnitureOnCanvas.length === 0 && (
                  <p className="absolute inset-0 flex items-center justify-center text-muted-foreground text-center px-4 pointer-events-none">
                    Drag furniture to this window
                  </p>
                )}
                {furnitureOnCanvas.map((f, idx) => renderFurnitureShape(f, dropTargetId === f.id, idx))}
              </div>
            </div>
            <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                className="w-8 h-8 rounded border border-border bg-background text-foreground flex items-center justify-center text-lg"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="w-8 h-8 rounded border border-border bg-background text-foreground flex items-center justify-center text-lg"
              >
                −
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between gap-4 py-3 border-t border-border mt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openManageStudents}
              className="py-2 px-3 rounded-md border border-border bg-muted/50 text-muted-foreground hover:bg-muted text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Manage participants
            </button>
            <button
              type="button"
              onClick={openManageRestrictions}
              className="py-2 px-3 rounded-md border border-border bg-muted/50 text-muted-foreground hover:bg-muted text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Manage restrictions
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={undoLayout}
              disabled={!canUndo}
              className="px-3 py-2 rounded-md border border-border bg-muted/50 text-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Undo
            </button>
            <button
              type="button"
              onClick={redoLayout}
              disabled={!canRedo}
              className="px-3 py-2 rounded-md border border-border bg-muted/50 text-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
              title="Redo (Ctrl+Y)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
              Redo
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2 rounded-md border border-border bg-muted/50 text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleShuffle}
              className="px-4 py-2 rounded-md border border-border bg-muted/50 text-foreground hover:bg-muted flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Shuffle
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-md border border-border bg-muted/50 text-foreground hover:bg-muted flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
                <h2 id="students-sheet-title" className="text-xl font-semibold text-neutral-900 dark:text-white">Participants</h2>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Enter names on separate lines.</p>
            </div>
            <div className="flex-1 min-h-0 px-6 pb-4 overflow-auto">
              <textarea
                value={manageStudentsText}
                onChange={(e) => setManageStudentsText(e.target.value)}
                placeholder={"e.g. John Smith\nJane Doe"}
                rows={8}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-4 py-3 text-base placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y min-h-[180px] mt-4"
                aria-label="Names, one per line"
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
                          <label className="text-xs text-neutral-500 dark:text-neutral-400">Participant 1</label>
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
                          <label className="text-xs text-neutral-500 dark:text-neutral-400">Participant 2</label>
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

      <Footer />
    </div>
  );
}
