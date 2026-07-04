"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

interface ConfirmButtonProps extends Omit<ButtonProps, "onClick"> {
  message: string;
  onConfirm: () => void | Promise<void>;
}

export default function ConfirmButton({ message, onConfirm, children, ...props }: ConfirmButtonProps) {
  const handleClick = async () => {
    if (!window.confirm(message)) return;
    await onConfirm();
  };

  return (
    <button {...props} onClick={handleClick}>
      {children}
    </button>
  );
}
