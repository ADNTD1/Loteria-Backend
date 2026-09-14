import type { Request, Response } from "express";
import type { User } from "../interfaces/user.interface.js";


// repositorio simualado de Users para calar que jale

const UserRepository: User[] = [
  {
    id: "1",
    accountNumber: "20000111",
    name: "Adrian",
    totalWins: 100
  }
]

export const getUserByAccountNumber = (req: Request, res: Response) => {

  const { accountNumber } = req.params

  const user = UserRepository.find(u => u.accountNumber === accountNumber)

  if (!user) {
    return res.status(404).json({
      ok: false,
      message: "Usuario no encontrado"
    });
  }

  return res.json({
    ok: true,
    data: user
  });
};
