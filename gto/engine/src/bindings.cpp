// Python bindings: flipup_gto._engine
#include <pybind11/functional.h>
#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "flipup/cards.h"
#include "flipup/eval.h"
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

  m.def("parse_card", &parse_card);
  m.def("card_to_string", &card_to_string);
  m.def("combo_index", &combo_index);
  m.def("combo_cards", [](int combo) { return std::make_pair(combo_card(combo, 0), combo_card(combo, 1)); });
  m.def("evaluate", [](const std::vector<int>& cards) { return evaluate(cards); });
  m.def("describe_strength", &describe_strength);
  m.def("strength_category", &strength_category);
  m.def("category_name", &category_name);

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
          [](Solver& s, const std::vector<std::string>& path, bool with_equity) {
            NodeInfo info;
            {
              py::gil_scoped_release release;
              info = s.query(path, with_equity);
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
          py::arg("path"), py::arg("with_equity") = true);
}
