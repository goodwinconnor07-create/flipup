// Python bindings: flipup_gto._engine
#include <pybind11/functional.h>
#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "flipup/cards.h"
#include "flipup/equity.h"
#include "flipup/eval.h"
#include "flipup/multiway.h"
#include "flipup/preflop.h"
#include "flipup/solver.h"

namespace py = pybind11;
using namespace flipup;

namespace {

py::array_t<float> to_numpy(const std::vector<float>& v) {
  py::array_t<float> a(static_cast<py::ssize_t>(v.size()));
  std::copy(v.begin(), v.end(), a.mutable_data());
  return a;
}

py::array_t<float> to_numpy_2d(const std::vector<float>& v, size_t rows) {
  size_t cols = rows ? v.size() / rows : 0;
  py::array_t<float> a({static_cast<py::ssize_t>(rows), static_cast<py::ssize_t>(cols)});
  std::copy(v.begin(), v.end(), a.mutable_data());
  return a;
}

const char* node_type_name(NodeType t) {
  switch (t) {
    case NodeType::ACTION: return "action";
    case NodeType::CHANCE: return "chance";
    case NodeType::FOLD: return "fold";
    case NodeType::SHOWDOWN: return "showdown";
    case NodeType::ALLIN: return "allin";
    case NodeType::LEAF: return "leaf";
  }
  return "?";
}

const char* mw_action_name(MWAction::Type t) {
  switch (t) {
    case MWAction::FOLD: return "fold";
    case MWAction::CHECK: return "check";
    case MWAction::CALL: return "call";
    case MWAction::BET: return "bet";
    case MWAction::RAISE: return "raise";
  }
  return "?";
}

const char* action_name(Action::Type t) {
  switch (t) {
    case Action::FOLD: return "fold";
    case Action::CHECK: return "check";
    case Action::CALL: return "call";
    case Action::BET: return "bet";
    case Action::RAISE: return "raise";
  }
  return "?";
}

}  // namespace

PYBIND11_MODULE(_engine, m) {
  m.doc() = "FlipUp GTO engine core (C++)";
  py::register_exception<std::length_error>(m, "TreeTooLarge", PyExc_MemoryError);

  m.def("parse_card", &parse_card);
  m.def("card_to_string", &card_to_string);
  m.def("combo_index", &combo_index);
  m.def("combo_cards", [](int combo) { return std::make_pair(combo_card(combo, 0), combo_card(combo, 1)); });
  m.def("evaluate", [](const std::vector<int>& cards) { return evaluate(cards); });
  m.def("describe_strength", &describe_strength);
  m.def("strength_category", &strength_category);
  m.def("category_name", &category_name);

  m.def("combo_class", &combo_class);
  m.def(
      "equity_vs_range",
      [](int combo, const std::vector<float>& range, const std::vector<int>& board, int samples, uint64_t seed) {
        EquityResult r;
        {
          py::gil_scoped_release release;
          r = equity_vs_range(combo, range, board, samples, seed);
        }
        return py::make_tuple(r.win, r.tie, r.lose);
      },
      py::arg("combo"), py::arg("range"), py::arg("board"), py::arg("samples") = 20000, py::arg("seed") = 1);
  m.def(
      "range_equities",
      [](const std::vector<float>& hero, const std::vector<float>& villain, const std::vector<int>& board,
         int samples, uint64_t seed) {
        std::vector<float> r;
        {
          py::gil_scoped_release release;
          r = range_equities(hero, villain, board, samples, seed);
        }
        return to_numpy(r);
      },
      py::arg("hero"), py::arg("villain"), py::arg("board"), py::arg("samples") = 20000, py::arg("seed") = 1);
  m.def("preflop_equity_exact", [](int a, int b) {
    EquityResult r;
    {
      py::gil_scoped_release release;
      r = preflop_equity_exact(a, b);
    }
    return py::make_tuple(r.win, r.tie, r.lose);
  });
  m.def("preflop_class_matrix", [](int samples, uint64_t seed) {
    ClassMatrix cm;
    {
      py::gil_scoped_release release;
      cm = preflop_class_matrix(samples, seed);
    }
    return py::make_tuple(to_numpy_2d(cm.equity, NUM_CLASSES), to_numpy_2d(cm.pairs, NUM_CLASSES));
  });
  m.def("preflop_class_tensor3", [](int samples, uint64_t seed) {
    std::vector<float> t;
    {
      py::gil_scoped_release release;
      t = preflop_class_tensor3(samples, seed);
    }
    py::array_t<float> a({NUM_CLASSES, NUM_CLASSES, NUM_CLASSES});
    std::copy(t.begin(), t.end(), a.mutable_data());
    return a;
  });


  py::class_<PreflopForced>(m, "PreflopForced")
      .def(py::init([](int player, int type, double to) { return PreflopForced{player, type, to}; }),
           py::arg("player"), py::arg("type"), py::arg("to") = 0.0)
      .def_readwrite("player", &PreflopForced::player)
      .def_readwrite("type", &PreflopForced::type)
      .def_readwrite("to", &PreflopForced::to);

  py::class_<PreflopConfig>(m, "PreflopConfig")
      .def(py::init<>())
      .def_readwrite("num_players", &PreflopConfig::num_players)
      .def_readwrite("stacks", &PreflopConfig::stacks)
      .def_readwrite("sb", &PreflopConfig::sb)
      .def_readwrite("bb", &PreflopConfig::bb)
      .def_readwrite("ante", &PreflopConfig::ante)
      .def_readwrite("rake_rate", &PreflopConfig::rake_rate)
      .def_readwrite("rake_cap", &PreflopConfig::rake_cap)
      .def_readwrite("rake_growth", &PreflopConfig::rake_growth)
      .def_readwrite("multiway_class_weight", &PreflopConfig::multiway_class_weight)
      .def_readwrite("class_k_ip", &PreflopConfig::class_k_ip)
      .def_readwrite("class_k_oop", &PreflopConfig::class_k_oop)
      .def_readwrite("class_d", &PreflopConfig::class_d)
      .def_readwrite("open_size", &PreflopConfig::open_size)
      .def_readwrite("can_limp", &PreflopConfig::can_limp)
      .def_readwrite("iso_per_limper", &PreflopConfig::iso_per_limper)
      .def_readwrite("bb_raise_vs_limp", &PreflopConfig::bb_raise_vs_limp)
      .def_readwrite("threebet_ip", &PreflopConfig::threebet_ip)
      .def_readwrite("threebet_oop", &PreflopConfig::threebet_oop)
      .def_readwrite("squeeze_per_caller", &PreflopConfig::squeeze_per_caller)
      .def_readwrite("fourbet_ip", &PreflopConfig::fourbet_ip)
      .def_readwrite("fourbet_oop", &PreflopConfig::fourbet_oop)
      .def_readwrite("allin_threshold", &PreflopConfig::allin_threshold)
      .def_readwrite("allin_option_stack", &PreflopConfig::allin_option_stack)
      .def_readwrite("max_raises", &PreflopConfig::max_raises)
      .def_readwrite("max_players_flop", &PreflopConfig::max_players_flop)
      .def_readwrite("allow_cold_call", &PreflopConfig::allow_cold_call)
      .def_readwrite("multiway_blinds_only", &PreflopConfig::multiway_blinds_only)
      .def_readwrite("eqr_ip", &PreflopConfig::eqr_ip)
      .def_readwrite("eqr_oop", &PreflopConfig::eqr_oop)
      .def_readwrite("eqr_model", &PreflopConfig::eqr_model)
      .def_readwrite("class_eqr_ip", &PreflopConfig::class_eqr_ip)
      .def_readwrite("class_eqr_oop", &PreflopConfig::class_eqr_oop)
      .def_readwrite("kind_eqr_ip", &PreflopConfig::kind_eqr_ip)
      .def_readwrite("kind_eqr_oop", &PreflopConfig::kind_eqr_oop)
      .def_readwrite("kind_eqr_present", &PreflopConfig::kind_eqr_present)
      .def_readwrite("multiway_role", &PreflopConfig::multiway_role)
      .def_readwrite("initial_range", &PreflopConfig::initial_range)
      .def_readwrite("forced", &PreflopConfig::forced)
      .def("set_tables", [](PreflopConfig& c, py::array_t<float, py::array::c_style | py::array::forcecast> eq,
                            py::array_t<float, py::array::c_style | py::array::forcecast> pairs,
                            py::object ta, py::object tb) {
        c.equity.assign(eq.data(), eq.data() + eq.size());
        c.pairs.assign(pairs.data(), pairs.data() + pairs.size());
        c.tensor_rank = 0;
        c.tensor_a.clear();
        c.tensor_b.clear();
        if (!ta.is_none() && !tb.is_none()) {
          auto a = ta.cast<py::array_t<float, py::array::c_style | py::array::forcecast>>();
          auto b = tb.cast<py::array_t<float, py::array::c_style | py::array::forcecast>>();
          if (a.ndim() != 3 || a.shape(0) != NUM_CLASSES || a.shape(2) != NUM_CLASSES)
            throw std::invalid_argument("tensor factors must be [169][rank][169]");
          c.tensor_rank = static_cast<int>(a.shape(1));
          c.tensor_a.assign(a.data(), a.data() + a.size());
          c.tensor_b.assign(b.data(), b.data() + b.size());
        }
      }, py::arg("equity"), py::arg("pairs"), py::arg("tensor_a") = py::none(), py::arg("tensor_b") = py::none());

  m.def("position_names", &position_names);

  py::class_<PreflopSolver>(m, "PreflopSolver")
      .def(py::init<const PreflopConfig&>(), py::call_guard<py::gil_scoped_release>())
      .def_property_readonly("num_nodes", &PreflopSolver::num_nodes)
      .def_property_readonly("num_action_nodes", &PreflopSolver::num_action_nodes)
      .def_property_readonly("iterations", &PreflopSolver::iterations_done)
      .def("iterate", &PreflopSolver::iterate, py::call_guard<py::gil_scoped_release>())
      .def("nash_conv", [](PreflopSolver& s) {
        std::vector<double> per;
        double total;
        {
          py::gil_scoped_release release;
          total = s.nash_conv(&per);
        }
        return py::make_tuple(total, per);
      })
      .def("player_ev", &PreflopSolver::player_ev, py::call_guard<py::gil_scoped_release>())
      .def("cumulative_strategy", [](const PreflopSolver& s) { return to_numpy(s.cumulative_strategy()); })
      .def("regrets", [](const PreflopSolver& s) { return to_numpy(s.regrets()); })
      .def("load_cumulative_strategy",
           [](PreflopSolver& s, py::array_t<float, py::array::c_style | py::array::forcecast> a, int iterations,
              py::object regrets) {
             std::vector<float> r;
             if (!regrets.is_none()) {
               auto ra = regrets.cast<py::array_t<float, py::array::c_style | py::array::forcecast>>();
               r.assign(ra.data(), ra.data() + ra.size());
             }
             s.load_cumulative_strategy(std::vector<float>(a.data(), a.data() + a.size()), iterations, r);
           },
           py::arg("cum"), py::arg("iterations"), py::arg("regrets") = py::none())
      .def("solve", [](PreflopSolver& s, int max_iterations, double target_bb, int check_every, py::object cb) {
        std::function<bool(int, double)> f = nullptr;
        if (!cb.is_none())
          f = [cb](int it, double nc) {
            py::gil_scoped_acquire gil;
            py::object r = cb(it, nc);
            return r.is_none() ? true : r.cast<bool>();
          };
        py::gil_scoped_release release;
        return s.solve(max_iterations, target_bb, check_every, f);
      }, py::arg("max_iterations") = 1000, py::arg("target_bb") = 0.01, py::arg("check_every") = 25,
         py::arg("callback") = py::none())
      .def("query", [](PreflopSolver& s, const std::vector<int>& path) {
        PreflopNodeInfo info;
        {
          py::gil_scoped_release release;
          info = s.query(path);
        }
        static const char* names[] = {"fold", "check", "call", "raise", "allin"};
        py::dict d;
        d["terminal"] = info.terminal;
        d["terminal_kind"] = info.terminal_kind;
        d["player"] = info.player;
        d["pot"] = info.pot;
        d["invested"] = info.invested;
        d["folded"] = info.folded;
        py::list acts;
        for (const auto& a : info.actions) {
          py::dict ad;
          ad["type"] = names[a.type];
          ad["to"] = a.to;
          ad["added"] = a.added;
          acts.append(ad);
        }
        d["actions"] = acts;
        std::vector<float> flat;
        for (const auto& r : info.reach) flat.insert(flat.end(), r.begin(), r.end());
        d["reach"] = to_numpy_2d(flat, info.reach.size());
        if (!info.terminal) {
          d["strategy"] = to_numpy_2d(info.strategy, info.actions.size());
          d["action_ev"] = to_numpy_2d(info.action_ev, info.actions.size());
          d["ev"] = to_numpy(info.ev);
        } else {
          d["ev"] = to_numpy_2d(info.ev, info.invested.size());
        }
        return d;
      });

  py::class_<BetSize>(m, "BetSize")
      .def(py::init([](int kind, double value) {
             BetSize b;
             b.kind = static_cast<BetSize::Kind>(kind);
             b.value = value;
             return b;
           }),
           py::arg("kind"), py::arg("value") = 0.0)
      .def_readwrite("value", &BetSize::value)
      .def_property_readonly("kind", [](const BetSize& b) { return static_cast<int>(b.kind); });

  py::class_<StreetSizes>(m, "StreetSizes")
      .def(py::init<>())
      .def_readwrite("bet", &StreetSizes::bet)
      .def_readwrite("raise_", &StreetSizes::raise)
      .def_readwrite("donk", &StreetSizes::donk);

  py::class_<TreeConfig>(m, "TreeConfig")
      .def(py::init<>())
      .def_readwrite("board", &TreeConfig::board)
      .def_readwrite("starting_pot", &TreeConfig::starting_pot)
      .def_readwrite("effective_stack", &TreeConfig::effective_stack)
      .def_readwrite("max_raises", &TreeConfig::max_raises)
      .def_readwrite("min_bet", &TreeConfig::min_bet)
      .def_readwrite("add_allin_threshold", &TreeConfig::add_allin_threshold)
      .def_readwrite("force_allin_threshold", &TreeConfig::force_allin_threshold)
      .def_readwrite("merge_threshold", &TreeConfig::merge_threshold)
      .def_readwrite("rake_rate", &TreeConfig::rake_rate)
      .def_readwrite("rake_cap", &TreeConfig::rake_cap)
      .def_readwrite("compress", &TreeConfig::compress)
      .def_readwrite("max_memory_mb", &TreeConfig::max_memory_mb)
      .def_readwrite("leaf_street", &TreeConfig::leaf_street)
      .def_readwrite("leaf_k", &TreeConfig::leaf_k)
      .def_readwrite("leaf_w", &TreeConfig::leaf_w)
      .def_readwrite("leaf_b", &TreeConfig::leaf_b)
      .def_readwrite("leaf_alpha", &TreeConfig::leaf_alpha)
      .def_readwrite("leaf_s_edges", &TreeConfig::leaf_s_edges)
      .def_readwrite("averaging", &TreeConfig::averaging)
      .def("set_sizes",
           [](TreeConfig& c, int player, int street, const StreetSizes& s) {
             if (player < 0 || player > 1 || street < 0 || street > 2) throw std::out_of_range("player/street");
             c.sizes[player][street] = s;
           })
      .def("set_range", [](TreeConfig& c, int player, const std::vector<float>& w) {
        if (player < 0 || player > 1) throw std::out_of_range("player");
        if (w.size() != NUM_COMBOS) throw std::invalid_argument("range needs 1326 weights");
        c.range[player] = w;
      });

  py::class_<SolveStatus>(m, "SolveStatus")
      .def_readonly("iteration", &SolveStatus::iteration)
      .def_readonly("exploitability", &SolveStatus::exploitability)
      .def_readonly("exploitability_pct", &SolveStatus::exploitability_pct)
      .def_readonly("seconds", &SolveStatus::seconds);

  py::class_<Solver>(m, "Solver")
      .def(py::init<const TreeConfig&>(), py::call_guard<py::gil_scoped_release>())
      .def_property_readonly("num_nodes", &Solver::num_nodes)
      .def_property_readonly("num_action_nodes", &Solver::num_action_nodes)
      .def_property_readonly("memory_bytes", &Solver::memory_bytes)
      .def_property_readonly("iterations", &Solver::iterations_done)
      .def("hand_combos", &Solver::hand_combos)
      .def(
          "solve",
          [](Solver& s, int max_iterations, double target_pct, int check_every, py::object callback) {
            std::function<bool(const SolveStatus&)> cb = nullptr;
            if (!callback.is_none()) {
              cb = [callback](const SolveStatus& st) {
                py::gil_scoped_acquire gil;
                py::object r = callback(st);
                return r.is_none() ? true : r.cast<bool>();
              };
            }
            py::gil_scoped_release release;
            return s.solve(max_iterations, target_pct, check_every, cb);
          },
          py::arg("max_iterations") = 1000, py::arg("target_pct") = 0.3, py::arg("check_every") = 10,
          py::arg("callback") = py::none())
      .def("iterate", &Solver::iterate, py::call_guard<py::gil_scoped_release>())
      .def("exploitability", &Solver::exploitability, py::call_guard<py::gil_scoped_release>())
      .def("root_ev", &Solver::root_ev, py::call_guard<py::gil_scoped_release>())
      .def("request_stop", &Solver::request_stop)
      .def(
          "query",
          [](Solver& s, const std::vector<std::string>& path, bool with_equity, bool with_ev) {
            NodeInfo info;
            {
              py::gil_scoped_release release;
              info = s.query(path, with_equity, with_ev);
            }
            py::dict d;
            d["type"] = node_type_name(info.type);
            d["player"] = info.player;
            d["street"] = info.street;
            d["pot"] = info.pot;
            d["contrib"] = py::make_tuple(info.contrib[0], info.contrib[1]);
            d["stack"] = py::make_tuple(info.stack[0], info.stack[1]);
            d["board"] = info.board;
            py::list actions;
            for (const auto& a : info.actions) {
              py::dict ad;
              ad["type"] = action_name(a.type);
              ad["amount"] = a.amount;
              ad["added"] = a.added;
              ad["all_in"] = a.all_in;
              actions.append(ad);
            }
            d["actions"] = actions;
            d["deal_cards"] = info.deal_cards;
            for (int p = 0; p < 2; ++p) {
              std::string k = std::to_string(p);
              d[("combos" + k).c_str()] = info.combos[p];
              d[("reach" + k).c_str()] = to_numpy(info.reach[p]);
              d[("weight" + k).c_str()] = to_numpy(info.weight[p]);
              d[("ev" + k).c_str()] = to_numpy(info.ev[p]);
              d[("equity" + k).c_str()] = to_numpy(info.equity[p]);
            }
            if (info.type == NodeType::ACTION) {
              d["strategy"] = to_numpy_2d(info.strategy, info.actions.size());
              d["action_ev"] = to_numpy_2d(info.action_ev, info.actions.size());
            }
            return d;
          },
          py::arg("path"), py::arg("with_equity") = true, py::arg("with_ev") = true);

  py::class_<MWConfig>(m, "MWConfig")
      .def(py::init<>())
      .def_readwrite("players", &MWConfig::players)
      .def_readwrite("board", &MWConfig::board)
      .def_readwrite("pot", &MWConfig::pot)
      .def_readwrite("stack", &MWConfig::stack)
      .def_readwrite("range", &MWConfig::range)
      .def_readwrite("max_raises", &MWConfig::max_raises)
      .def_readwrite("end_street", &MWConfig::end_street)
      .def_readwrite("deal_subset", &MWConfig::deal_subset)
      .def_readwrite("min_bet", &MWConfig::min_bet)
      .def_readwrite("add_allin_threshold", &MWConfig::add_allin_threshold)
      .def_readwrite("force_allin_threshold", &MWConfig::force_allin_threshold)
      .def_readwrite("merge_threshold", &MWConfig::merge_threshold)
      .def_readwrite("dcfr_alpha", &MWConfig::dcfr_alpha)
      .def_readwrite("dcfr_gamma", &MWConfig::dcfr_gamma)
      .def_readwrite("max_memory_mb", &MWConfig::max_memory_mb)
      .def("set_sizes", [](MWConfig& c, int street, const std::vector<double>& bet, const std::vector<double>& raise) {
        if (street < 0 || street > 2) throw std::invalid_argument("street 0-2");
        c.bet[street] = bet;
        c.raise[street] = raise;
      });

  py::class_<MultiwaySolver>(m, "MultiwaySolver")
      .def(py::init<const MWConfig&>(), py::call_guard<py::gil_scoped_release>())
      .def_property_readonly("num_nodes", &MultiwaySolver::num_nodes)
      .def_property_readonly("num_action_nodes", &MultiwaySolver::num_action_nodes)
      .def_property_readonly("memory_bytes", &MultiwaySolver::memory_bytes)
      .def_property_readonly("iterations", &MultiwaySolver::iteration)
      .def("iterate", &MultiwaySolver::iterate, py::call_guard<py::gil_scoped_release>())
      .def("exploitability_pct", &MultiwaySolver::exploitability_pct, py::call_guard<py::gil_scoped_release>())
      .def("root_ev", &MultiwaySolver::root_ev, py::call_guard<py::gil_scoped_release>())
      .def("request_stop", &MultiwaySolver::request_stop)
      .def(
          "query",
          [](MultiwaySolver& s, const std::vector<int>& path, bool with_ev, bool with_equity) {
            MWNodeInfo info;
            {
              py::gil_scoped_release release;
              info = s.query(path, with_ev, with_equity);
            }
            static const char* TYPES[] = {"action", "chance", "fold", "showdown"};
            py::dict d;
            d["type"] = TYPES[info.type];
            d["player"] = info.player;
            d["street"] = info.street;
            d["pot"] = info.pot;
            d["contrib"] = info.contrib;
            d["wager"] = info.wager;
            d["active"] = info.active;
            d["board"] = info.board;
            py::list actions;
            for (const auto& a : info.actions) {
              py::dict ad;
              ad["type"] = mw_action_name(a.type);
              ad["amount"] = a.amount;
              ad["added"] = a.added;
              ad["all_in"] = a.all_in;
              actions.append(ad);
            }
            d["actions"] = actions;
            d["deal_cards"] = info.deal_cards;
            auto rows = [](const std::vector<std::vector<float>>& v) {
              py::list l;
              for (const auto& r : v) l.append(to_numpy(r));
              return l;
            };
            d["reach"] = rows(info.reach);
            d["strategy"] = rows(info.strategy);
            d["action_ev"] = rows(info.action_ev);
            d["ev"] = rows(info.ev);
            d["equity"] = rows(info.equity);
            return d;
          },
          py::arg("path"), py::arg("with_ev") = true, py::arg("with_equity") = false);
}
