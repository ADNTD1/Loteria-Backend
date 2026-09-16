export interface Room {
    id: string;
    hostAccountNumber: string;
    code: string;
    status: RoomStatus;
    players: string[];
    createdAt: Date;
}
export declare enum RoomStatus {
    WAITING = "WAITING",
    PLAYING = "PLAYING",
    FINISHED = "FINISHED"
}
//# sourceMappingURL=room.interface.d.ts.map