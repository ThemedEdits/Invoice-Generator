import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./use-auth";
import { Invoice, InsertInvoice } from "@shared/schema";

export function useInvoices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invoices", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, "invoices"),
        where("userId", "==", user.uid),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
    },
    enabled: !!user,
  });
}

export function useInvoice(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invoices", id],
    queryFn: async () => {
      if (!user || !id) return null;
      const docRef = doc(db, "invoices", id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) throw new Error("Invoice not found");
      return { id: snapshot.id, ...snapshot.data() } as Invoice;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<InsertInvoice, 'userId'>) => {
      if (!user) throw new Error("Not authenticated");
      const docRef = await addDoc(collection(db, "invoices"), {
        ...data,
        userId: user.uid,
        createdAt: Date.now(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", user?.uid] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string, status: Invoice['status'] }) => {
      const docRef = doc(db, "invoices", id);
      await updateDoc(docRef, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", variables.id] });
    },
  });
}
