import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Promotions() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/banners", { replace: true });
  }, [navigate]);

  return null;
}

