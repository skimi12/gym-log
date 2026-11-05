#ifndef GYM_ANALYTICS_CORE_HPP
#define GYM_ANALYTICS_CORE_HPP

// The core deliberately has no standard-library, allocation, or host dependencies.
// GCC/Clang floating-point builtins also work in a freestanding wasm32 build.
namespace gym {

enum class LoadType : int {
  Weighted = 0,
  Bodyweight = 1,
  BodyweightAdded = 2,
  Assisted = 3,
};

enum class Metric : int {
  MaxWeight = 0,
  MaxReps = 1,
  Estimated1RM = 2,
  Volume = 3,
};

constexpr bool is_valid_load_type(int value) noexcept {
  return value >= 0 && value <= 3;
}

constexpr bool is_valid_metric(int value) noexcept {
  return value >= 0 && value <= 3;
}

// Independent instances may be used for different exercises. Each set is consumed
// once, in O(1) time and space. Presence is separate from its numeric value: zero
// assistance, zero added weight, and an underflowed volume can be valid metrics.
class Accumulator {
 public:
  constexpr Accumulator() noexcept = default;

  // An invalid enum clears the instance and disables it until a valid reset.
  void reset(LoadType load_type) noexcept;
  void add_set(double weight_kg, double reps, bool has_weight) noexcept;

  bool has_metric(Metric metric) const noexcept;
  // Returns zero for an unavailable/invalid metric; consult has_metric first.
  double metric(Metric metric) const noexcept;

  // Raw volume includes positive finite weight/reps regardless of load type.
  // The Volume metric itself is available only for ordinary Weighted exercises.
  double volume() const noexcept { return volume_; }
  double total_reps() const noexcept { return total_reps_; }
  double recorded_count() const noexcept { return recorded_count_; }

 private:
  enum Flag : unsigned int {
    HasPositiveWeight = 1U,
    HasAssistance = 2U,
    HasEstimate = 4U,
  };

  LoadType load_type_ = LoadType::Weighted;
  unsigned int flags_ = 0;
  double max_weight_ = 0;
  double max_reps_ = 0;
  double min_assistance_ = 0;
  double estimated_1rm_ = 0;
  double volume_ = 0;
  double total_reps_ = 0;
  double recorded_count_ = 0;
};

}  // namespace gym

// Stable ABI v1: load-type and metric IDs are the enum values above. All numeric
// results, including counts, use double so JS callers do not need i64/BigInt.
// This ABI owns ONE instance. A caller must complete reset/add/query synchronously
// without interleaving another calculation on the same WebAssembly instance.
extern "C" {
int gym_abi_version() noexcept;
void gym_reset(int load_type) noexcept;
void gym_add_set(double weight_kg, double reps, int has_weight) noexcept;
int gym_has_metric(int metric) noexcept;
double gym_metric(int metric) noexcept;
double gym_volume() noexcept;
double gym_total_reps() noexcept;
double gym_recorded_count() noexcept;
}

#endif  // GYM_ANALYTICS_CORE_HPP
