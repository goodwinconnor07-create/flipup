"""Hand histories: the input format for hand review.

JSON schema (chip amounts in table chips; "to" is the player's total street wager after the
action, matching FlipUp's "bets 40" / "raises to 120" / "calls 120" log semantics):

{
  "id": "table-abc#17",
  "small_blind": 1, "big_blind": 2, "ante": 0,
  "button": "p3",
  "players": [
    {"id": "p1", "name": "Ollie", "seat": 0, "stack": 200, "cards": ["Ah", "Kd"]},
    {"id": "p2", "name": "Connor", "seat": 1, "stack": 340, "cards": null}, ...
  ],
  "actions": [
    {"street": "preflop", "player": "p1", "move": "raise", "to": 6},
    {"street": "preflop", "player": "p2", "move": "call", "to": 6},
    {"street": "flop", "player": "p2", "move": "check"}, ...
  ],
  "board": ["Ks", "9d", "5c", "2h", "Qh"]
}

Blinds are posted automatically (do not list them). Moves: fold, check, call, bet, raise, allin.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .cards import parse_cards

STREETS = ["preflop", "flop", "turn", "river"]


@dataclass
class HHPlayer:
    id: str
    name: str
    seat: int
    stack: float           # chips at the start of the hand (before blinds)
    cards: list | None     # card indices, or None if unknown


@dataclass
class HHAction:
    street: str
    player: str
    move: str              # fold, check, call, bet, raise, allin
    to: float = 0.0        # total street wager after the action


@dataclass
class HandHistory:
    id: str
    small_blind: float
    big_blind: float
    ante: float
    button: str
    players: list
    actions: list
    board: list = field(default_factory=list)

    # -- construction ------------------------------------------------------
    @classmethod
    def from_dict(cls, d: dict) -> "HandHistory":
        players = [HHPlayer(str(p["id"]), p.get("name", str(p["id"])), int(p.get("seat", i)), float(p["stack"]),
                            parse_cards(p["cards"]) if p.get("cards") else None)
                   for i, p in enumerate(d["players"])]
        actions = [HHAction(a["street"], str(a["player"]), a["move"], float(a.get("to", 0) or 0))
                   for a in d["actions"]]
        for a in actions:
            if a.street not in STREETS:
                raise ValueError(f"bad street {a.street!r}")
            if a.move not in ("fold", "check", "call", "bet", "raise", "allin"):
                raise ValueError(f"bad move {a.move!r}")
        hh = cls(str(d.get("id", "")), float(d["small_blind"]), float(d["big_blind"]), float(d.get("ante", 0)),
                 str(d["button"]), players, actions, parse_cards(d.get("board", [])))
        hh.validate()
        return hh

    @classmethod
    def from_flipup_log(cls, log: dict, players: list, small_blind: float, big_blind: float) -> "HandHistory":
        """Adapter for FlipUp's HandLog ({number, lines, holes, shown}).

        `players`: [{"id", "name", "seat"}] for everyone dealt in (names must be unique).
        Stacks, the button and every action are read from the log lines.
        """
        by_name = {p["name"]: p for p in players}
        names = sorted(by_name, key=len, reverse=True)  # longest first so "Al" doesn't match "Alex"

        def who(line: str):
            for n in names:
                if line.startswith(n + " "):
                    return by_name[n], line[len(n) + 1:]
            return None, line

        stacks: dict = {}
        button = None
        street = "preflop"
        actions: list = []
        board: list = []
        num = lambda s: float(s.replace(",", ""))  # noqa: E731
        for line in log["lines"]:
            m = re.match(r"-- Hand #\d+ \(dealer: (.+)\) --", line)
            if m:
                button = by_name[m.group(1)]["id"]
                continue
            if line.startswith("Stacks: "):
                for part in line[len("Stacks: "):].split(" · "):
                    name, amount = part.rsplit(" ", 1)
                    stacks[by_name[name]["id"]] = num(amount)
                continue
            m = re.match(r"(Flop|Turn|River): (.*)", line)
            if m:
                street = m.group(1).lower()
                board = parse_cards(re.findall(r"\[(..)\]", m.group(2)))
                continue
            p, rest = who(line)
            if p is None:
                continue
            if rest == "folds" or rest == "leaves and folds":
                actions.append({"street": street, "player": p["id"], "move": "fold"})
            elif rest == "checks":
                actions.append({"street": street, "player": p["id"], "move": "check"})
            elif rest.startswith("calls "):
                actions.append({"street": street, "player": p["id"], "move": "call", "to": num(rest[6:])})
            elif rest.startswith("bets "):
                actions.append({"street": street, "player": p["id"], "move": "bet", "to": num(rest[5:])})
            elif rest.startswith("raises to "):
                actions.append({"street": street, "player": p["id"], "move": "raise", "to": num(rest[10:])})
            elif rest.startswith("goes all in for "):
                actions.append({"street": street, "player": p["id"], "move": "allin", "to": num(rest[16:])})
        if button is None:
            raise ValueError("log has no dealer line")
        holes = log.get("holes", {})
        plist = [{"id": p["id"], "name": p["name"], "seat": p["seat"], "stack": stacks.get(p["id"], 0),
                  "cards": holes.get(p["id"]) or None} for p in players if p["id"] in stacks]
        return cls.from_dict({"id": f"hand-{log.get('number', '')}", "small_blind": small_blind,
                              "big_blind": big_blind, "button": button, "players": plist, "actions": actions,
                              "board": board})

    # -- derived info ----------------------------------------------------------
    def validate(self):
        ids = {p.id for p in self.players}
        if self.button not in ids:
            raise ValueError("button must be one of the players")
        for a in self.actions:
            if a.player not in ids:
                raise ValueError(f"unknown player {a.player!r} in actions")
        if len(self.players) < 2:
            raise ValueError("need at least two players")

    def player(self, pid: str) -> HHPlayer:
        return next(p for p in self.players if p.id == pid)

    def preflop_order(self) -> list:
        """Player ids in preflop action order (first to act ... SB, BB; heads-up: BTN/SB, BB)."""
        seats = sorted(self.players, key=lambda p: p.seat)
        bi = next(i for i, p in enumerate(seats) if p.id == self.button)
        clockwise = [seats[(bi + k) % len(seats)].id for k in range(1, len(seats) + 1)]  # SB, BB, ..., BTN
        if len(seats) == 2:
            return [self.button, clockwise[0]]
        sb, bb = clockwise[0], clockwise[1]
        rest = clockwise[2:]  # UTG ... BTN
        return rest + [sb, bb]

    def positions(self) -> dict:
        from . import _engine
        order = self.preflop_order()
        names = _engine.position_names(len(order))
        return {pid: names[i] for i, pid in enumerate(order)}

    def board_at(self, street: str) -> list:
        n = {"preflop": 0, "flop": 3, "turn": 4, "river": 5}[street]
        return self.board[:n]
