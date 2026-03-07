import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./use-auth";
import { Template, InsertTemplate } from "@shared/schema";

export function useTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["templates", user?.uid],
    queryFn: async () => {
      if (!user) {
        console.log("[useTemplates] No user logged in");
        return [];
      }
      try {
        console.log("[useTemplates] Fetching templates for user:", user.uid);
        const q = query(
          collection(db, "templates"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        console.log("[useTemplates] Found templates:", snapshot.size);
        const templates = snapshot.docs.map(doc => {
          console.log("[useTemplates] Template:", doc.id, doc.data());
          return { id: doc.id, ...doc.data() } as Template;
        });
        return templates;
      } catch (err) {
        console.error("[useTemplates] Error fetching templates:", err);
        throw err;
      }
    },
    enabled: !!user,
  });
}

export function useTemplate(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["templates", id],
    queryFn: async () => {
      if (!user || !id) return null;
      const docRef = doc(db, "templates", id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) throw new Error("Template not found");
      return { id: snapshot.id, ...snapshot.data() } as Template;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateTemplate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<InsertTemplate, 'userId'>) => {
      if (!user) throw new Error("Not authenticated");
      try {
        console.log("[useCreateTemplate] Creating template for user:", user.uid);
        console.log("[useCreateTemplate] Template data:", data);
        const docRef = await addDoc(collection(db, "templates"), {
          ...data,
          userId: user.uid,
          createdAt: Date.now(),
        });
        console.log("[useCreateTemplate] Template created with ID:", docRef.id);
        return docRef.id;
      } catch (err) {
        console.error("[useCreateTemplate] Error creating template:", err);
        throw err;
      }
    },
    onSuccess: (id) => {
      console.log("[useCreateTemplate] Invalidating cache for templates");
      queryClient.invalidateQueries({ queryKey: ["templates"], exact: false });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Template> & { id: string }) => {
      const docRef = doc(db, "templates", id);
      await updateDoc(docRef, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["templates"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["templates", variables.id] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "templates", id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"], exact: false });
    },
  });
}
