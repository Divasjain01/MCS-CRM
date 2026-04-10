import { useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import { Calendar, MoreHorizontal, Plus, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SourceBadge } from "@/components/ui/source-badge";
import { useAuth } from "@/context/AuthContext";
import { useLeadsQuery, useUpdateLeadStageMutation } from "@/hooks/use-leads";
import { useUsersQuery } from "@/hooks/use-users";
import { stageLabels } from "@/lib/crm-config";
import { cn } from "@/lib/utils";
import type { Lead, LeadStage } from "@/types/crm";

const stages: LeadStage[] = [
  "new",
  "attempting_contact",
  "qualified",
  "visit_booked",
  "visit_done",
  "quotation_sent",
  "negotiation",
  "won",
  "lost",
  "dormant",
];

const stageColors: Record<LeadStage, string> = {
  new: "bg-info",
  attempting_contact: "bg-warning",
  qualified: "bg-primary",
  visit_booked: "bg-purple-500",
  visit_done: "bg-indigo-500",
  quotation_sent: "bg-orange-500",
  negotiation: "bg-teal-500",
  won: "bg-success",
  lost: "bg-destructive",
  dormant: "bg-slate-500",
};

type LeadsByStage = Record<LeadStage, Lead[]>;

export default function PipelinePage() {
  const { authUser } = useAuth();
  const usersQuery = useUsersQuery();
  const leadsQuery = useLeadsQuery(usersQuery.data ?? []);
  const updateStageMutation = useUpdateLeadStageMutation();
  const [localOverrides, setLocalOverrides] = useState<Record<string, LeadStage>>({});

  const groupedLeads = useMemo(() => {
    const grouped = {} as LeadsByStage;
    stages.forEach((stage) => {
      grouped[stage] = [];
    });

    (leadsQuery.data ?? []).forEach((lead) => {
      const currentStage = localOverrides[lead.id] ?? lead.stage;
      const effectiveStage = currentStage === "connected" ? "qualified" : currentStage;
      grouped[effectiveStage].push({ ...lead, stage: effectiveStage });
    });

    return grouped;
  }, [leadsQuery.data, localOverrides]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const lead = groupedLeads[source.droppableId as LeadStage][source.index];
    const nextStage = destination.droppableId as LeadStage;

    setLocalOverrides((previous) => ({ ...previous, [lead.id]: nextStage }));

    try {
      await updateStageMutation.mutateAsync({
        leadId: lead.id,
        stage: nextStage,
        actorId: authUser?.id ?? null,
      });
    } catch (_error) {
      setLocalOverrides((previous) => {
        const next = { ...previous };
        delete next[lead.id];
        return next;
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 h-[calc(100vh-140px)]"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">Drag and drop to move leads between stages</p>
        </div>
        <Button className="gap-2" asChild>
          <Link to="/leads">
            <Plus className="h-4 w-4" />
            Add Lead
          </Link>
        </Button>
      </div>

      <DragDropContext onDragEnd={(result) => void onDragEnd(result)}>
        <div className="custom-scrollbar flex h-full gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage} className="flex max-w-[300px] min-w-[300px] flex-col rounded-xl bg-muted/30">
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", stageColors[stage])} />
                  <h3 className="text-sm font-medium">{stageLabels[stage]}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {groupedLeads[stage].length}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "custom-scrollbar min-h-[200px] flex-1 space-y-2 overflow-y-auto p-2",
                      snapshot.isDraggingOver && "bg-primary/5",
                    )}
                  >
                    {leadsQuery.isLoading ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        Loading...
                      </div>
                    ) : (
                      groupedLeads[stage].map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(draggableProvided, draggableSnapshot) => (
                            <div
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              {...draggableProvided.dragHandleProps}
                              className={cn(
                                "kanban-card",
                                draggableSnapshot.isDragging && "dragging",
                              )}
                            >
                              <div className="mb-3 flex items-start justify-between">
                                <Link
                                  to={`/leads/${lead.id}`}
                                  className="text-sm font-medium transition-colors hover:text-primary"
                                >
                                  {lead.fullName}
                                </Link>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-6 w-6">
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Link to={`/leads/${lead.id}`}>View Details</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>Call</DropdownMenuItem>
                                    <DropdownMenuItem>WhatsApp</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              <div className="space-y-2">
                                <SourceBadge source={lead.source} className="text-[10px]" />
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  {lead.assignedUser && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>{lead.assignedUser.fullName.split(" ")[0]}</span>
                                    </div>
                                  )}
                                  {lead.nextFollowUpAt && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        {new Date(lead.nextFollowUpAt).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {lead.budget && (
                                  <p className="text-sm font-medium text-primary">
                                    Rs. {lead.budget.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </motion.div>
  );
}
