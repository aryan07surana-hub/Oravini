import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export function useAuth() {
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  return { user: user || null, isLoading };
}

export function useLogout() {
  const [, navigate] = useLocation();
  return useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      navigate("/login");
    },
  });
}
