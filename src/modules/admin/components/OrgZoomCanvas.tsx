"use client";

import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import FitScreenOutlinedIcon from "@mui/icons-material/FitScreenOutlined";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import { Box, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  clampOrgZoom,
  fitOrgZoom,
  formatOrgZoom,
  ORG_ZOOM_DEFAULT,
  ORG_ZOOM_MAX,
  ORG_ZOOM_MIN,
  stepOrgZoom,
} from "@/modules/admin/org-zoom";

type Props = {
  children: ReactNode;
  fitKey?: string;
};

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button, a, input, textarea, [role='button']"));
}

export function OrgZoomCanvas({ children, fitKey }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [zoom, setZoom] = useState(ORG_ZOOM_DEFAULT);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    setZoom(
      fitOrgZoom(
        { width: viewport.clientWidth, height: viewport.clientHeight },
        { width: content.offsetWidth, height: content.offsetHeight },
      ),
    );
    setPan({ x: 0, y: 0 });
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let fitted = false;
    const apply = () => {
      if (fitted || viewport.clientWidth < 32 || viewport.clientHeight < 32) return;
      fitted = true;
      fitToView();
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fitKey, fitToView]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
        setZoom((current) => stepOrgZoom(current, event.deltaY < 0 ? 1 : -1));
        return;
      }
      setPan((current) => ({ x: current.x - event.deltaX, y: current.y - event.deltaY }));
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          px: 0.5,
          bgcolor: "background.paper",
        }}
      >
        <Tooltip title="Diminuir zoom">
          <span>
            <IconButton
              size="small"
              aria-label="Diminuir zoom"
              disabled={zoom <= ORG_ZOOM_MIN}
              onClick={() => setZoom((current) => stepOrgZoom(current, -1))}
            >
              <RemoveOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Typography variant="caption" sx={{ minWidth: 40, textAlign: "center", fontWeight: 700 }}>
          {formatOrgZoom(zoom)}
        </Typography>
        <Tooltip title="Aumentar zoom">
          <span>
            <IconButton
              size="small"
              aria-label="Aumentar zoom"
              disabled={zoom >= ORG_ZOOM_MAX}
              onClick={() => setZoom((current) => stepOrgZoom(current, 1))}
            >
              <AddOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Ajustar à tela">
          <IconButton size="small" aria-label="Ajustar à tela" onClick={fitToView}>
            <FitScreenOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom 100%">
          <IconButton
            size="small"
            aria-label="Zoom 100%"
            onClick={() => {
              setZoom(ORG_ZOOM_DEFAULT);
              setPan({ x: 0, y: 0 });
            }}
          >
            <Typography variant="caption" fontWeight={700}>
              1:1
            </Typography>
          </IconButton>
        </Tooltip>
      </Paper>

      <Box
        ref={viewportRef}
        tabIndex={0}
        aria-label="Organograma. Arraste para mover; use + e − para o zoom."
        onPointerDown={(event) => {
          if (event.button !== 0 || isInteractiveTarget(event.target)) return;
          dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
          event.currentTarget.setPointerCapture(event.pointerId);
          setPanning(true);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag) return;
          setPan({
            x: drag.panX + event.clientX - drag.x,
            y: drag.panY + event.clientY - drag.y,
          });
        }}
        onPointerUp={() => {
          dragRef.current = null;
          setPanning(false);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setPanning(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            setZoom((current) => stepOrgZoom(current, 1));
          }
          if (event.key === "-" || event.key === "_") {
            event.preventDefault();
            setZoom((current) => stepOrgZoom(current, -1));
          }
          if (event.key === "0") {
            event.preventDefault();
            setZoom(ORG_ZOOM_DEFAULT);
            setPan({ x: 0, y: 0 });
          }
        }}
        sx={{
          flex: 1,
          minHeight: { xs: 320, md: 360 },
          overflow: "hidden",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.default",
          cursor: panning ? "grabbing" : "grab",
          userSelect: "none",
          touchAction: "none",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          outline: "none",
        }}
      >
        <Box
          ref={contentRef}
          sx={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${clampOrgZoom(zoom)})`,
            transformOrigin: "top center",
            willChange: "transform",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
