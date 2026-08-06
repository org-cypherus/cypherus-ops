"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { downloadDataUrl, fileToDataUrl } from "@/lib/utils/download";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  useAddAttachment,
  useDeleteLead,
  useLeadContracts,
  useRemoveAttachment,
  useUpdateLead,
} from "../hooks";
import type { Lead } from "../types";
import { PIPELINE_STAGES } from "../types";

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}

type SectionKey = "personal" | "address" | "commercial" | "process" | "observations" | null;

export function LeadDetail({ lead }: { lead: Lead }) {
  const updateLead = useUpdateLead(lead.id);
  const deleteLead = useDeleteLead();
  const addAttachment = useAddAttachment(lead.id);
  const removeAttachment = useRemoveAttachment(lead.id);
  const contracts = useLeadContracts(lead.id);
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<SectionKey>(null);
  const [draft, setDraft] = useState<Record<string, string | number>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function startEdit(section: SectionKey, values: Record<string, string | number>) {
    setEditing(section);
    setDraft(values);
  }

  function saveSection(payload: Partial<Lead>) {
    updateLead.mutate(payload, {
      onSuccess: () => {
        enqueueSnackbar("Lead atualizado", { variant: "success" });
        setEditing(null);
      },
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file);
      await addAttachment.mutateAsync({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        url: dataUrl,
      });
    }
    enqueueSnackbar("Anexo(s) enviado(s)", { variant: "success" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
            gap={2}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main" }}>
                {lead.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h5">{lead.name}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                  <StatusBadge label={lead.status} />
                  {lead.legalStatus ? <StatusBadge label={`Jurídico: ${lead.legalStatus}`} /> : null}
                  <Typography variant="body2" color="text.secondary">
                    Responsável: {lead.ownerName}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <IconButton component="a" href={`tel:${lead.phone}`} color="primary">
                <PhoneOutlinedIcon />
              </IconButton>
              <IconButton
                component="a"
                href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                color="success"
              >
                <WhatsAppIcon />
              </IconButton>
              <IconButton component="a" href={`mailto:${lead.email}`} color="primary">
                <EmailOutlinedIcon />
              </IconButton>
              <TextField
                select
                size="small"
                label="Status"
                value={lead.status}
                onChange={(e) =>
                  updateLead.mutate({ status: e.target.value as Lead["status"] })
                }
                sx={{ minWidth: 200 }}
              >
                {PIPELINE_STAGES.map((stage) => (
                  <MenuItem key={stage} value={stage}>
                    {stage}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => setConfirmDelete(true)}
              >
                Excluir
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Informações pessoais</Typography>
                  {editing !== "personal" ? (
                    <IconButton
                      size="small"
                      onClick={() =>
                        startEdit("personal", {
                          name: lead.name,
                          email: lead.email,
                          phone: lead.phone,
                          whatsapp: lead.whatsapp,
                          cpf: lead.cpf,
                          rg: lead.rg || "",
                          birthDate: lead.birthDate || "",
                        })
                      }
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Stack>
                {editing === "personal" ? (
                  <Stack spacing={1.5}>
                    <TextField label="Nome" size="small" value={draft.name || ""} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                    <TextField label="E-mail" size="small" value={draft.email || ""} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
                    <TextField label="Telefone" size="small" value={draft.phone || ""} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
                    <TextField label="WhatsApp" size="small" value={draft.whatsapp || ""} onChange={(e) => setDraft((d) => ({ ...d, whatsapp: e.target.value }))} />
                    <TextField label="CPF" size="small" value={draft.cpf || ""} onChange={(e) => setDraft((d) => ({ ...d, cpf: e.target.value }))} />
                    <TextField label="RG" size="small" value={draft.rg || ""} onChange={(e) => setDraft((d) => ({ ...d, rg: e.target.value }))} />
                    <TextField label="Nascimento" type="date" size="small" InputLabelProps={{ shrink: true }} value={String(draft.birthDate || "").slice(0, 10)} onChange={(e) => setDraft((d) => ({ ...d, birthDate: e.target.value }))} />
                    <Stack direction="row" spacing={1}>
                      <Button onClick={() => setEditing(null)}>Cancelar</Button>
                      <Button variant="contained" onClick={() => saveSection({
                        name: String(draft.name),
                        email: String(draft.email),
                        phone: String(draft.phone),
                        whatsapp: String(draft.whatsapp),
                        cpf: String(draft.cpf),
                        rg: String(draft.rg),
                        birthDate: String(draft.birthDate),
                      })}>
                        Salvar
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}><Field label="E-mail" value={lead.email} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><Field label="Telefone" value={lead.phone} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><Field label="WhatsApp" value={lead.whatsapp} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><Field label="CPF" value={lead.cpf} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><Field label="RG" value={lead.rg} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><Field label="Nascimento" value={formatDate(lead.birthDate)} /></Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Endereço</Typography>
                  {editing !== "address" ? (
                    <IconButton
                      size="small"
                      onClick={() =>
                        startEdit("address", {
                          cep: lead.address.cep,
                          street: lead.address.street,
                          number: lead.address.number,
                          neighborhood: lead.address.neighborhood,
                          city: lead.address.city,
                          state: lead.address.state,
                        })
                      }
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Stack>
                {editing === "address" ? (
                  <Stack spacing={1.5}>
                    {(["cep", "street", "number", "neighborhood", "city", "state"] as const).map((key) => (
                      <TextField
                        key={key}
                        label={key}
                        size="small"
                        value={draft[key] || ""}
                        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                      />
                    ))}
                    <Stack direction="row" spacing={1}>
                      <Button onClick={() => setEditing(null)}>Cancelar</Button>
                      <Button
                        variant="contained"
                        onClick={() =>
                          saveSection({
                            address: {
                              cep: String(draft.cep || ""),
                              street: String(draft.street || ""),
                              number: String(draft.number || ""),
                              neighborhood: String(draft.neighborhood || ""),
                              city: String(draft.city || ""),
                              state: String(draft.state || ""),
                            },
                          })
                        }
                      >
                        Salvar
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="CEP" value={lead.address.cep} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><Field label="Rua" value={lead.address.street} /></Grid>
                    <Grid size={{ xs: 12, sm: 2 }}><Field label="Nº" value={lead.address.number} /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Bairro" value={lead.address.neighborhood} /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Cidade" value={lead.address.city} /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Estado" value={lead.address.state} /></Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Informações comerciais</Typography>
                  {editing !== "commercial" ? (
                    <IconButton
                      size="small"
                      onClick={() =>
                        startEdit("commercial", {
                          origin: lead.origin,
                          campaign: lead.campaign,
                          channel: lead.channel,
                          priority: lead.priority,
                          tags: lead.tags.join(", "),
                        })
                      }
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Stack>
                {editing === "commercial" ? (
                  <Stack spacing={1.5}>
                    <TextField label="Origem" size="small" value={draft.origin || ""} onChange={(e) => setDraft((d) => ({ ...d, origin: e.target.value }))} />
                    <TextField label="Campanha" size="small" value={draft.campaign || ""} onChange={(e) => setDraft((d) => ({ ...d, campaign: e.target.value }))} />
                    <TextField label="Canal" size="small" value={draft.channel || ""} onChange={(e) => setDraft((d) => ({ ...d, channel: e.target.value }))} />
                    <TextField select label="Prioridade" size="small" value={draft.priority || "media"} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}>
                      <MenuItem value="baixa">baixa</MenuItem>
                      <MenuItem value="media">media</MenuItem>
                      <MenuItem value="alta">alta</MenuItem>
                    </TextField>
                    <TextField label="Tags (vírgula)" size="small" value={draft.tags || ""} onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))} />
                    <Stack direction="row" spacing={1}>
                      <Button onClick={() => setEditing(null)}>Cancelar</Button>
                      <Button
                        variant="contained"
                        onClick={() =>
                          saveSection({
                            origin: String(draft.origin),
                            campaign: String(draft.campaign),
                            channel: String(draft.channel),
                            priority: draft.priority as Lead["priority"],
                            tags: String(draft.tags || "")
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean),
                          })
                        }
                      >
                        Salvar
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Origem" value={lead.origin} /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Campanha" value={lead.campaign} /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Canal" value={lead.channel} /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Prioridade" value={lead.priority} /></Grid>
                    <Grid size={{ xs: 12, sm: 8 }}><Field label="Tags" value={lead.tags.join(", ")} /></Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Dados do processo</Typography>
                  {editing !== "process" ? (
                    <IconButton
                      size="small"
                      onClick={() =>
                        startEdit("process", {
                          bank: lead.process.bank || "",
                          installments: lead.process.installments || 0,
                          installmentValue: lead.process.installmentValue || 0,
                          financedValue: lead.process.financedValue || 0,
                          totalValue: lead.process.totalValue,
                          contractType: lead.process.contractType || "",
                          notes: lead.process.notes || "",
                        })
                      }
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Stack>
                {editing === "process" ? (
                  <Stack spacing={1.5}>
                    <TextField label="Banco" size="small" value={draft.bank || ""} onChange={(e) => setDraft((d) => ({ ...d, bank: e.target.value }))} />
                    <TextField label="Parcelas" type="number" size="small" value={draft.installments || 0} onChange={(e) => setDraft((d) => ({ ...d, installments: Number(e.target.value) }))} />
                    <TextField label="Valor parcela" type="number" size="small" value={draft.installmentValue || 0} onChange={(e) => setDraft((d) => ({ ...d, installmentValue: Number(e.target.value) }))} />
                    <TextField label="Valor financiado" type="number" size="small" value={draft.financedValue || 0} onChange={(e) => setDraft((d) => ({ ...d, financedValue: Number(e.target.value) }))} />
                    <TextField label="Valor total" type="number" size="small" value={draft.totalValue || 0} onChange={(e) => setDraft((d) => ({ ...d, totalValue: Number(e.target.value) }))} />
                    <TextField label="Tipo contrato" size="small" value={draft.contractType || ""} onChange={(e) => setDraft((d) => ({ ...d, contractType: e.target.value }))} />
                    <TextField label="Observações" multiline minRows={2} size="small" value={draft.notes || ""} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
                    <Stack direction="row" spacing={1}>
                      <Button onClick={() => setEditing(null)}>Cancelar</Button>
                      <Button
                        variant="contained"
                        onClick={() =>
                          saveSection({
                            process: {
                              bank: String(draft.bank || ""),
                              installments: Number(draft.installments || 0),
                              installmentValue: Number(draft.installmentValue || 0),
                              financedValue: Number(draft.financedValue || 0),
                              totalValue: Number(draft.totalValue || 0),
                              contractType: String(draft.contractType || ""),
                              notes: String(draft.notes || ""),
                            },
                          })
                        }
                      >
                        Salvar
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Banco" value={lead.process.bank} /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Parcelas" value={lead.process.installments} /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Valor parcela" value={formatCurrency(lead.process.installmentValue || 0)} /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Valor financiado" value={formatCurrency(lead.process.financedValue || 0)} /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Valor total" value={formatCurrency(lead.process.totalValue)} /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Field label="Tipo contrato" value={lead.process.contractType} /></Grid>
                    <Grid size={12}><Field label="Observações do processo" value={lead.process.notes} /></Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6">Observações</Typography>
                  {editing !== "observations" ? (
                    <IconButton
                      size="small"
                      onClick={() => startEdit("observations", { observations: lead.observations || "" })}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Stack>
                {editing === "observations" ? (
                  <Stack spacing={1.5}>
                    <TextField
                      multiline
                      minRows={3}
                      size="small"
                      value={draft.observations || ""}
                      onChange={(e) => setDraft((d) => ({ ...d, observations: e.target.value }))}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button onClick={() => setEditing(null)}>Cancelar</Button>
                      <Button
                        variant="contained"
                        onClick={() => saveSection({ observations: String(draft.observations || "") })}
                      >
                        Salvar
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Typography variant="body2">{lead.observations || "—"}</Typography>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Timeline
                </Typography>
                <Stack spacing={1.5} divider={<Divider flexItem />}>
                  {lead.timeline.map((event) => (
                    <Box key={event.id}>
                      <Typography variant="subtitle2">{event.type}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {event.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.userName} · {formatDate(event.createdAt)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Anexos
                </Typography>
                <Box
                  border="1px dashed"
                  borderColor={dragOver ? "primary.main" : "divider"}
                  borderRadius={2}
                  p={2}
                  textAlign="center"
                  mb={2}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    void handleFiles(e.dataTransfer.files);
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Arraste arquivos ou clique para enviar
                  </Typography>
                  <Button size="small" sx={{ mt: 1 }} onClick={() => fileInputRef.current?.click()} disabled={addAttachment.isPending}>
                    Selecionar
                  </Button>
                  <input
                    ref={fileInputRef}
                    hidden
                    type="file"
                    multiple
                    onChange={(e) => void handleFiles(e.target.files)}
                  />
                </Box>
                {lead.attachments.map((file) => (
                  <Stack key={file.id} direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Button size="small" onClick={() => downloadDataUrl(file.name, file.url)}>
                      {file.name}
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() =>
                        removeAttachment.mutate(file.id, {
                          onSuccess: () => enqueueSnackbar("Anexo removido", { variant: "info" }),
                        })
                      }
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Contratos vinculados
                </Typography>
                <Stack spacing={1} mb={1.5}>
                  {(contracts.data || []).map((c) => (
                    <Button key={c.id} component={Link} href={`/contracts/${c.id}`} size="small" sx={{ justifyContent: "flex-start" }}>
                      {c.templateName} — {c.status}
                    </Button>
                  ))}
                  {!contracts.data?.length ? (
                    <Typography variant="body2" color="text.secondary">
                      Nenhum contrato
                    </Typography>
                  ) : null}
                </Stack>
                <Button component={Link} href={`/contracts/new?leadId=${lead.id}`} size="small" variant="contained">
                  Gerar contrato
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir lead"
        description="Esta ação remove o lead do pipeline. Continuar?"
        confirmLabel="Excluir"
        loading={deleteLead.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          deleteLead.mutate(lead.id, {
            onSuccess: () => {
              enqueueSnackbar("Lead excluído", { variant: "success" });
              router.push("/leads");
            },
          })
        }
      />
    </Stack>
  );
}
