import { useState } from "react";

export const useSearch = () => {
  const [searchOpen, setSearchOpen] = useState(false);

  return {
    searchOpen,
    setSearchOpen,
  };
};
