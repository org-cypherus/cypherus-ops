import { Box, CircularProgress } from "@mui/material";

export default function Loading() {
  return (
    <Box py={8} display="flex" justifyContent="center">
      <CircularProgress />
    </Box>
  );
}
