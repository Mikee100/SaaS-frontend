"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/utils/api";

interface SupportTicket {
  id: string;
  tenantId: string;
  tenantName: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'general';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  resolution?: string;
  attachments?: string[];
}

interface TicketResponse {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

export default function SupportTicketsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [newResponse, setNewResponse] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  type TicketStatus = 'all' | 'open' | 'in_progress' | 'resolved';
  type TicketPriority = 'all' | 'low' | 'medium' | 'high' | 'critical';
  
  const [filter, setFilter] = useState<TicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority>('all');

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const fetchTickets = useCallback(async () => {
    if (!user?.isSuperadmin) return;
    
    try {
      setLoadingTickets(true);
      const data = await apiGet(
        `/admin/support/tickets?status=${filter}&priority=${priorityFilter}`
      ) as SupportTicket[];
      setTickets(data);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoadingTickets(false);
    }
  }, [filter, priorityFilter, user?.isSuperadmin]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);


  const fetchTicketResponses = async (ticketId: string) => {
    try {
      const data = await apiGet(`/admin/support/tickets/${ticketId}/responses`);
      setResponses(data);
    } catch (error) {
      console.error("Failed to fetch responses:", error);
    }
  };

  const handleTicketClick = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    fetchTicketResponses(ticket.id);
  };

  const handleStatusChange = useCallback(async (ticketId: string, status: SupportTicket['status']) => {
    try {
      await apiPut(`/admin/support/tickets/${ticketId}`, { status });
      setTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === ticketId ? { ...ticket, status } : ticket
        )
      );
      setSelectedTicket(prev => prev?.id === ticketId ? { ...prev, status } : prev);
    } catch (error) {
      console.error("Failed to update ticket status:", error);
    }
  }, []);

  const handlePriorityChange = useCallback(async (ticketId: string, priority: SupportTicket['priority']) => {
    try {
      await apiPut(`/admin/support/tickets/${ticketId}`, { priority });
      setTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === ticketId ? { ...ticket, priority } : ticket
        )
      );
      setSelectedTicket(prev => prev?.id === ticketId ? { ...prev, priority } : prev);
    } catch (error) {
      console.error("Failed to update ticket priority:", error);
    }
  }, []);

  const sendResponse = async () => {
    if (!selectedTicket || !newResponse.trim()) return;

    try {
      await apiPost(`/admin/support/tickets/${selectedTicket.id}/responses`, {
        message: newResponse,
        isInternal
      });
      setNewResponse("");
      fetchTicketResponses(selectedTicket.id);
    } catch (error) {
      console.error("Failed to send response:", error);
    }
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open': return '#ef4444';
      case 'in_progress': return '#f97316';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading || !user) return null;

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: 24 }}>
        Support Tickets
      </h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <select 
          value={filter} 
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value as TicketStatus)}
          style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        
        <select 
          value={priorityFilter} 
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriorityFilter(e.target.value as TicketPriority)}
          style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", height: "calc(100vh - 200px)" }}>
        {/* Tickets List */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <div style={{ padding: "1rem", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>
              Tickets ({tickets.length})
            </h3>
          </div>
          
          <div style={{ height: "calc(100% - 60px)", overflowY: "auto" }}>
            {loadingTickets ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No tickets found</div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleTicketClick(ticket)}
                  style={{
                    padding: "1rem",
                    borderBottom: "1px solid #e5e7eb",
                    cursor: "pointer",
                    background: selectedTicket?.id === ticket.id ? "#f3f4f6" : "#fff",
                    transition: "background 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: "600" }}>{ticket.subject}</h4>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <span style={{ 
                        padding: "0.25rem 0.5rem", 
                        borderRadius: "4px", 
                        fontSize: 12, 
                        fontWeight: "500",
                        background: getPriorityColor(ticket.priority) + "20",
                        color: getPriorityColor(ticket.priority)
                      }}>
                        {ticket.priority}
                      </span>
                      <span style={{ 
                        padding: "0.25rem 0.5rem", 
                        borderRadius: "4px", 
                        fontSize: 12, 
                        fontWeight: "500",
                        background: getStatusColor(ticket.status) + "20",
                        color: getStatusColor(ticket.status)
                      }}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: "0.5rem 0", fontSize: 14, color: "#6b7280" }}>
                    {ticket.description.substring(0, 100)}...
                  </p>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {ticket.tenantName} • {ticket.userName} • {new Date(ticket.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ticket Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" }}>
          {selectedTicket ? (
            <>
              <div style={{ padding: "1rem", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>{selectedTicket.subject}</h3>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                        handlePriorityChange(selectedTicket.id, e.target.value as 'low' | 'medium' | 'high' | 'critical')}
                      style={{ padding: "0.25rem", borderRadius: "4px", border: "1px solid #d1d5db", fontSize: 12 }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <select
                      value={selectedTicket.status}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                        handleStatusChange(selectedTicket.id, e.target.value as 'open' | 'in_progress' | 'resolved' | 'closed')}
                      style={{ padding: "0.25rem", borderRadius: "4px", border: "1px solid #d1d5db", fontSize: 12 }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>
                  {selectedTicket.tenantName} • {selectedTicket.userName} ({selectedTicket.userEmail})
                </div>
              </div>

              <div style={{ padding: "1rem", flex: 1, overflowY: "auto" }}>
                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: 16, fontWeight: "600" }}>Description</h4>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{selectedTicket.description}</p>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: 16, fontWeight: "600" }}>Responses</h4>
                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {responses.map((response) => (
                      <div key={response.id} style={{ 
                        marginBottom: "1rem", 
                        padding: "0.75rem", 
                        background: response.isInternal ? "#fef3c7" : "#f3f4f6",
                        borderRadius: "6px",
                        borderLeft: `4px solid ${response.isInternal ? "#f59e0b" : "#3b82f6"}`
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <span style={{ fontWeight: "500", fontSize: 14 }}>{response.userName}</span>
                          <span style={{ fontSize: 12, color: "#6b7280" }}>
                            {response.isInternal ? "Internal" : "Public"}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>{response.message}</p>
                        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: "0.5rem" }}>
                          {new Date(response.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: 16, fontWeight: "600" }}>Add Response</h4>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 14 }}>
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                      />
                      Internal note (not visible to client)
                    </label>
                  </div>
                  <textarea
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    placeholder="Type your response..."
                    style={{
                      width: "100%",
                      minHeight: "100px",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      resize: "vertical",
                      fontSize: 14
                    }}
                  />
                  <button
                    onClick={sendResponse}
                    disabled={!newResponse.trim()}
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.5rem 1rem",
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "500",
                      opacity: newResponse.trim() ? 1 : 0.5
                    }}
                  >
                    Send Response
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
              Select a ticket to view details
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 